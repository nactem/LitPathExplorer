//Important ideas
//Once I start reducing the graph I should keep record of the new connections

(function (window, undefined) {

//========================================================================================
//Force-based class  
var dataForForceBased = function(dataset,evidence, PMCIDtoPMID, articleMetaData, arrayOfOverridenEvents){
//converting the json into a format for the force-based graph

//nodes are the initial nodes
//reducedNodes after searching/before filtering by confidence
//reducedNodes2 after all filterings

//ditto with weights

	var nodes = dataset.nodeArray;
	var weights = dataset.linkArray;
	
	var globalMin = 0;
	var globalMax = 1;
	
	var mappingIndexName = dataset.nodeIdDict;//id|modelElement --> node index
    var mappingNameIndex = dataset.dictNormalisedNames;//normalisedName -->[node indices]
    var mappingEntityNameIndex = dataset.dictEntityNormalisedNames; //normalisedName(entities) -->[node indices]
    var mappingEventNameIndex = dataset.dictEventNormalisedNames; //normalisedName(events) -->[node indices]
    var mappingEntityTagNameIndex = dataset.dictEntityTagNames;  //tagName --> [node indices]
    var mappingModelElementIndex = dataset.dictModelElement;  //model element --> [node indices] (only for event nodes)
    var mappingLinkRoleIndex = dataset.dictLinkRoles; // role --> [weight index]
    
	
	//Counter on new bird species
	var counter = 0;

	this.nodes = nodes; 
	this.weights = weights;
	this.globalMin = globalMin;
	this.globalMax = globalMax;
    
    this.reducedNodes = nodes;
    this.mappingIndexName = mappingIndexName;
    this.mappingNameIndex = mappingNameIndex;
    this.mappingEntityNameIndex = mappingEntityNameIndex;
    this.mappingEventNameIndex = mappingEventNameIndex;
    this.mappingEntityTagNameIndex = mappingEntityTagNameIndex;
    this.mappingModelElementIndex = mappingModelElementIndex;
    this.mappingLinkRoleIndex = mappingLinkRoleIndex;
	this.typeEvent = {};
	this.typeEntity = {};
    this.evidence = evidence;
    
    this.PMCIDtoPMID = PMCIDtoPMID;
    this.articleMetaData = articleMetaData;
    
    var thisObject = this;
    
    this.lastRandomNotUsedId = 0;
    this.lastRandomNotUsedXmiId = 0;
    
    //Used for the white/blacklisting
    this.previousBlackList = [];
    this.previousWhiteList = [];
    
    //Used when we want the NN to be used for computing confidence
    this.NNmode = false;
    
    //Traverse the node data structure
    nodes.forEach(function(elem){
        
        elem.inModel = true;
        elem.x = -10;
        elem.y = -10;
        if (elem.tagName=='Event'){
            //Assign event confidence components
            thisObject.assignEventConfidenceComponents(elem);
            
            //elem.value = thisObject.evidence[elem['modelElement']]['meta']['uncertainty_score']==-1?0:thisObject.evidence[elem['modelElement']]['meta']['uncertainty_score'] ;
            elem.value = eventAgg.computeAggregatedValue(elem, eventAgg.SIMPLE_AVERAGE);
            
            //When overall confidence has been overridden by the user
            elem.confidenceEnabled = true;            
            
            if (thisObject.typeEvent.hasOwnProperty(elem.normalisedName)){
                thisObject.typeEvent[elem.normalisedName].push(elem);
            }
            else{
                thisObject.typeEvent[elem.normalisedName]= [elem];
            }
        }
        else{
            //tagName is entity
            elem.value = 1
            if (thisObject.typeEntity.hasOwnProperty(elem.tagName)){
                thisObject.typeEntity[elem.tagName].push(elem);
            }
            else{
                thisObject.typeEntity[elem.tagName]= [elem];
            }
        }
    });
    var eventNodes = nodes.filter(function(elem){return elem.tagName=='Event';});
    if (this.NNmode){
        eventAgg.serverSideComputeAggregatedValues(eventNodes, eventAgg.NEURAL_NETWORK);
    }
    
    
    //Traverse the weights data structure
    weights.forEach(function(elem){
        //elem.value = elem.source.value;//Math.random();
        if (thisObject.nodes[elem.source].tagName=='Event'){
            //elem.value = thisObject.evidence[thisObject.nodes[elem.source]['modelElement']]['meta']['uncertainty_score']==-1?0:thisObject.evidence[thisObject.nodes[elem.source]['modelElement']]['meta']['uncertainty_score'];
            elem.value = thisObject.nodes[elem.source].value;
            elem.inModel = true;            
        }
        else{
            console.log(' Events can be target nodes so modify this condition' )
        }
    });
    
    //Traverse evidence data structure so that they become part of the explorable graph (for discovery)
    for (var key in evidence) {
        // skip loop if the property is from prototype
        if (!evidence.hasOwnProperty(key)) continue;
        
        // skip loop if the event is hasmember   
        if (evidence[key].interaction_type == "hasmember") continue;
        
        //This is likely to change to whatever id is used to refer to missing events
        //Check if the id if the event is not in the model
        //Add here arbitrary insertions of the graph!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        if (!thisObject.mappingModelElementIndex.hasOwnProperty(key)){
            var part_a;
            var part_b;
            //Check if participants are in the model
            if (thisObject.mappingModelElementIndex[evidence[key].participant_a.model_element] == undefined){
                //Create entity node
                thisObject.createEntityNode(evidence[key].participant_a);
            }
            //Get node id
            part_a = thisObject.mappingModelElementIndex[evidence[key].participant_a.model_element][0];
            
            
            if (thisObject.mappingModelElementIndex[evidence[key].participant_b.model_element] == undefined){
                //Create entity node
                thisObject.createEntityNode(evidence[key].participant_b);
            }
            //Get node id
            part_b = thisObject.mappingModelElementIndex[evidence[key].participant_b.model_element][0];
            
                        
            //This is a hack as nodes need xmi_id and ids 
            var randomNotUsedId = thisObject.lastRandomNotUsedId;
            while (thisObject.mappingIndexName.hasOwnProperty(randomNotUsedId)){
                randomNotUsedId = randomNotUsedId +1;
            }
            thisObject.lastRandomNotUsedId = randomNotUsedId;
            
            var randomNotUsedXmiId = thisObject.lastRandomNotUsedXmiId;
            while (thisObject.mappingIndexName.hasOwnProperty(randomNotUsedXmiId)){
                randomNotUsedXmiId = randomNotUsedXmiId +1;
            }
            thisObject.lastRandomNotUsedXmiId = randomNotUsedXmiId;
            //partA_arg = "arg1";
            partA_arg = getMajorityRole(evidence[key].meta.enriched_evidence.enriched_participant_a);
            
            //partB_arg = "arg2";
            partB_arg = getMajorityRole(evidence[key].meta.enriched_evidence.enriched_participant_b);
            
            //Create new event node 
            var newEventNode = {"connected": [part_a,part_b], "connectedLinkIndex": [thisObject.weights.length, thisObject.weights.length+1], "id":key, "inModel": false, "modelElement": key, "normalisedName": evidence[key].interaction_type, "tagName": "Event", "value": evidence[key].meta.uncertainty_score, "x": -10, "y": -10, "xmi_id" : key,"confidenceEnabled":true};
            
            thisObject.assignEventConfidenceComponents(newEventNode);
            newEventNode.value = eventAgg.computeAggregatedValue(newEventNode, eventAgg.SIMPLE_AVERAGE);
            thisObject.nodes.push(jQuery.extend(true, {}, newEventNode));
            
            
            //Link new event node with those of the participants (needs to set the role for each entity)            
            thisObject.weights.push({"role":partA_arg, "source":thisObject.nodes.length-1, "target": part_a, "value": newEventNode.value});
            thisObject.weights.push({"role":partB_arg, "source":thisObject.nodes.length-1, "target": part_b, "value": newEventNode.value});
            
            //Add connection meta-data to the entity nodes
            thisObject.nodes[part_a].connected.push(thisObject.nodes.length-1);
            thisObject.nodes[part_a].connectedLinkIndex.push(thisObject.weights.length-1);
            thisObject.nodes[part_b].connected.push(thisObject.nodes.length-1);
            thisObject.nodes[part_b].connectedLinkIndex.push(thisObject.weights.length-1);            
            
            
            //Update mappings            
            this.mappingIndexName[key] = thisObject.nodes.length-1;
            if (!this.mappingNameIndex.hasOwnProperty(evidence[key].interaction_type)){
                this.mappingNameIndex[evidence[key].interaction_type] = []
            }
            this.mappingNameIndex[evidence[key].interaction_type].push(thisObject.nodes.length-1);
            
            if (!this.mappingEventNameIndex.hasOwnProperty(evidence[key].interaction_type)){
                this.mappingEventNameIndex[evidence[key].interaction_type] = []
            }
            this.mappingEventNameIndex[evidence[key].interaction_type].push(thisObject.nodes.length-1);
            
            if (!this.mappingLinkRoleIndex.hasOwnProperty(partA_arg)){
                this.mappingLinkRoleIndex[partA_arg] = []
            }
            this.mappingLinkRoleIndex[partA_arg].push(thisObject.weights.length-2);
            
            if (!this.mappingLinkRoleIndex.hasOwnProperty(partB_arg)){
                this.mappingLinkRoleIndex[partB_arg] = []
            }
            this.mappingLinkRoleIndex[partB_arg].push(thisObject.weights.length-1);
            
            this.mappingModelElementIndex[key] = [thisObject.nodes.length-1];            
            
            //Add event name if it hasn't beed added before (to make it available for searching)
            if (thisObject.typeEvent.hasOwnProperty(newEventNode.normalisedName)){
                thisObject.typeEvent[newEventNode.normalisedName].push(newEventNode);
            }
            else{
                thisObject.typeEvent[newEventNode.normalisedName]= [newEventNode];
            }
            
            //Add entity name if it hasn't been added before
            if (thisObject.typeEntity.hasOwnProperty(thisObject.nodes[part_a].tagName)){
                thisObject.typeEntity[thisObject.nodes[part_a].tagName].push(thisObject.nodes[part_a]);
            }
            else{
                thisObject.typeEntity[thisObject.nodes[part_a].tagName]= [thisObject.nodes[part_a]];
            }
            if (thisObject.typeEntity.hasOwnProperty(thisObject.nodes[part_b].tagName)){
                thisObject.typeEntity[thisObject.nodes[part_b].tagName].push(thisObject.nodes[part_b]);
            }
            else{
                thisObject.typeEntity[thisObject.nodes[part_b].tagName]= [thisObject.nodes[part_b]];
            }
        } 
    }
    
    //Compute NN-based confidence to the discovery nodes
    if (this.NNmode){
        eventNodes = nodes.filter(function(elem){return ((elem.tagName=='Event')&&(!elem.inModel));})
        eventAgg.serverSideComputeAggregatedValues(eventNodes, eventAgg.NEURAL_NETWORK);
    }
    
    //update confidences with the overriden event confidences
    arrayOfOverridenEvents.forEach(function(elem){
        thisObject.nodes[thisObject.mappingIndexName[elem.id]].value = elem.value;
        thisObject.nodes[thisObject.mappingIndexName[elem.id]].confidenceEnabled = false;
        thisObject.nodes[thisObject.mappingIndexName[elem.id]].polarity = (elem.value>=0)?1:-1;
    });
    
    
    
    
    //Has all the different types of events
    this.typeEventArray = Object.keys(this.typeEvent);
    this.typeEntityArray = Object.keys(this.typeEntity);
    
    function getMajorityRole(arrayOfSentences){
        var differentValues = {}
        arrayOfSentences.forEach(function(elem){
            if (differentValues.hasOwnProperty(elem.role)){
                differentValues[elem.role]=differentValues[elem.role]+1;
            }
            else{
                differentValues[elem.role]=1;
            }
        });
        var majority, majorityValue;
        cont = 0;
        Object.keys(differentValues).forEach(function(elem){
            if (cont==0){
                majority = elem;
                majorityValue = differentValues[elem];
            }
            else{
                if (differentValues[elem]> majorityValue){
                    majority = elem;
                    majorityValue = differentValues[elem];
                }
            }
            cont = cont + 1
            
        });
        return majority;
    }
}

dataForForceBased.prototype.assignEventConfidenceComponents = function(elem){
    //This is called when the event nodes are being populated to incorporate all the information that goes to the breakdown
    
    var thisObject = this;
    elem.polarity = thisObject.aggregatePolarity(thisObject.evidence[elem.modelElement],'negation');//Math.random()-0.5;
    if (elem.polarity == -1){
        //NOP
    }
        
    elem.languageCertainty = thisObject.aggregateLanguageCertainty(thisObject.evidence[elem.modelElement],'uncertainty');
    if (true){
        elem.nCitations = thisObject.aggregateSum(thisObject.evidence[elem.modelElement],'eventCitations');
        elem.altmetricPct = thisObject.aggregateAverage(thisObject.evidence[elem.modelElement],'eventAltmetricScore','pct');
        elem.altmetricScore = thisObject.aggregateAverage(thisObject.evidence[elem.modelElement],'eventAltmetricScore','score');
        elem.recency = thisObject.aggregateDatesAverage(thisObject.evidence[elem.modelElement],'pubDates');
        elem.impactFactor = thisObject.aggregateAverage(thisObject.evidence[elem.modelElement],'impactFactor');
        elem.nPapers = thisObject.computeNumberOfPapers(thisObject.evidence[elem.modelElement]);
    }/*
    else{
        elem.nCitations = 0;
        elem.altmetricPct = 0;
        elem.altmetricScore = 0;
        elem.recency = 0;
        elem.impactFactor = 0;
        elem.nPapers = 0;
        elem.nPapers = 0;
    }*/
    
    
}
dataForForceBased.prototype.exportEventConfidenceValues = function(scaleObject){
    //This is not used in the program but rather for training the ANN offline
    var arr=[]
    this.nodes.forEach(function(elem){
        if (elem.tagName=="Event"){
            //Shallow copy
            var newElem = jQuery.extend(true, {}, elem)
            newElem.nPapers = scaleObject.scalePapers(elem.nPapers);
            newElem.nCitations = scaleObject.scaleCitations(elem.nCitations);
            newElem.altmetricPct = elem.altmetricPct/100;
            newElem.impactFactor = scaleObject.scaleImpactFactor(elem.impactFactor);
            newElem.recency = scaleObject.scaleRecency(elem.recency);
            newElem.languageCertainty = elem.languageCertainty;
            arr.push(newElem);
        }
    })
    
    jQuerySendData(arr,'./cgi-bin/saveJSON.py')
    
    function jQuerySendData(dataToSend,urlString){
        $.ajax({
            url: urlString,
            data: JSON.stringify(dataToSend),
            type: 'POST',
            contentType: "application/json; charset=utf-8",
            success: function(data){
                console.log("Output: " + data);
            },
            error: function(request,error){
                alert("Request: " + JSON.stringify(request) + "eror :" + error);
            }
        });
    }
}

dataForForceBased.prototype.findAggregatedCitations = function (eventModelElement){
    //Not used anymore................
    var thisObject = this;
    var pubmedId;
    citeAcum = 0;
    var paperMentioned = {}
    this.evidence[eventModelElement]['meta']['enriched_evidence']['evidence'].forEach(function(elem,idx){
        pubmedId = PMCID ? thisObject.PMCIDtoPMID[elem.paper_id.slice(0,-4)]:elem['paper_id'];
        if (!paperMentioned.hasOwnProperty(pubmedId)){
            paperMentioned[pubmedId] = true;
            citeAcum = citeAcum + parseInt(thisObject.articleMetaData[pubmedId].pmcrefcount==""?"0":thisObject.articleMetaData[pubmedId].pmcrefcount);
        }
    });
    
    return citeAcum;
}

dataForForceBased.prototype.aggregateLanguageCertainty = function (eventModelElement,property){
    var sum, sumFinal;
    var paperMentioned = {}
    var certainty,polarity;
    if (eventModelElement['meta']['enriched_evidence']['evidence'].length>0){
        eventModelElement['meta']['enriched_evidence']['evidence'].forEach(function(elem){
            certainty = elem[property]?0.5:1;
            polarity = elem.hasOwnProperty("polarity")?elem["polarity"]:1;
            if (paperMentioned.hasOwnProperty(elem.paper_id)){
                paperMentioned[elem.paper_id].push(certainty * polarity);
            }
            else{
                paperMentioned[elem.paper_id] =[certainty*polarity];
            }
        });
        sumFinal = 0;
        count = 0;
        for (var prop in paperMentioned) {
            sum=0;
            if (paperMentioned.hasOwnProperty(prop)) {
                paperMentioned[prop].forEach(function(elem){
                    sum = sum + elem;
                })
                
            }
            sumFinal = sumFinal + sum/(paperMentioned[prop].length);
            count++;
        }
        return sumFinal/count;
    }
    else{
        return 0;
    }
}
        
dataForForceBased.prototype.aggregatePolarity = function (eventModelElement,propertyName){
    var sum, sumFinal;
    var paperMentioned = {}
    var certainty,polarity;
    if (eventModelElement['meta']['enriched_evidence']['evidence'].length>0){
        eventModelElement['meta']['enriched_evidence']['evidence'].forEach(function(elem){
            certainty = elem['uncertainty']?0.5:1;
            polarity = elem[propertyName]?-1:1;
            if (paperMentioned.hasOwnProperty(elem.paper_id)){
                paperMentioned[elem.paper_id].push(certainty * polarity);
            }
            else{
                paperMentioned[elem.paper_id] = [certainty * polarity];
            }
        });
        sumFinal = 0;
        count = 0;
        for (var prop in paperMentioned) {
            sum=0;
            if (paperMentioned.hasOwnProperty(prop)) {
                paperMentioned[prop].forEach(function(elem){
                    sum = sum + elem;
                })
                
            }
            sumFinal = sumFinal + sum/(paperMentioned[prop].length);
            count++;
        }
        return (sumFinal/count)>=0?1:-1;
    }
    else{
        return 0;
    }
}

        


dataForForceBased.prototype.aggregateAverage = function (eventModelElement,property,property2){
    var sum = 0;
    if (eventModelElement['meta']['enriched_evidence']['evidence'].length>0){
        if (property=='eventAltmetricScore'){
            eventModelElement['meta']['enriched_evidence'][property][property2].forEach(function(elem){
                sum = sum + parseFloat(elem);
            });
            return sum/eventModelElement['meta']['enriched_evidence'][property][property2].length;
        }
        else{
            eventModelElement['meta']['enriched_evidence'][property].forEach(function(elem){
                sum = sum + parseFloat(elem);
            });
            return sum/eventModelElement['meta']['enriched_evidence'][property].length;
        }
        
        
    }
    else{
        return 0;
    }
    
}

dataForForceBased.prototype.aggregateSum = function (eventModelElement,property,property2){
    var sum = 0;
    if (eventModelElement['meta']['enriched_evidence']['evidence'].length>0){
        if (property=='eventAltmetricScore'){
            eventModelElement['meta']['enriched_evidence'][property][property2].forEach(function(elem){
                sum = sum + parseFloat(elem);
            });
            return sum;
        }
        else{
            eventModelElement['meta']['enriched_evidence'][property].forEach(function(elem){
                sum = sum + parseFloat(elem);
            });
            return sum;
        }
    }
    else{
        return 0;
    }    
}

dataForForceBased.prototype.aggregateDatesAverage = function (eventModelElement,property){
    var sum = 0;
    if (eventModelElement['meta']['enriched_evidence']['evidence'].length>0){
        eventModelElement['meta']['enriched_evidence'][property].forEach(function(elem){
            sum = sum + Date.parse(elem);
        });
        return sum/eventModelElement['meta']['enriched_evidence'][property].length;
    }
     else{
         //Put today to make sure it has the minimum score
         return Date.now();
     }
}

dataForForceBased.prototype.computeNumberOfPapers = function (eventModelElement){
    var paperIds = {};
    var count = 0;
    
    eventModelElement['meta']['enriched_evidence']['evidence'].forEach(function(elem){
        if (!paperIds.hasOwnProperty(elem["paper_id"])){
            paperIds[elem.paper_id] = true;
            count = count +1
        }
    })
    
    return count; //eventModelElement['meta']['enriched_evidence']['evidence'].length;
}

dataForForceBased.prototype.createEntityNode = function (evidence){
    //This is called when an entity is mentioned in text but not in the model
    
    var thisObject = this;
    //This is a hack as nodes need xmi_id and ids 
        var randomNotUsedId = thisObject.lastRandomNotUsedId;
        while (this.mappingIndexName.hasOwnProperty(randomNotUsedId)){
            randomNotUsedId = randomNotUsedId +1;
        }
        thisObject.lastRandomNotUsedId = randomNotUsedId;
        
        var randomNotUsedXmiId = thisObject.lastRandomNotUsedXmiId;
        while (this.mappingIndexName.hasOwnProperty(randomNotUsedXmiId)){
            randomNotUsedXmiId = randomNotUsedXmiId +1;
        }
        thisObject.lastRandomNotUsedXmiId = randomNotUsedXmiId;
        
        
        //Create new entity node 
        var newEntityNode = {"connected": [], "connectedLinkIndex": [], "id":evidence.model_element, "inModel": false, "modelElement": evidence.model_element, "normalisedName": evidence.entity_text, "tagName": "Entity", "value": 1, "x": -10, "y": -10, "xmi_id" : evidence.model_element};
        this.nodes.push(jQuery.extend(true, {}, newEntityNode));
        
        //Update mappings            
        this.mappingIndexName[newEntityNode.modelElement] = thisObject.nodes.length-1;
        if (!this.mappingNameIndex.hasOwnProperty(newEntityNode.normalisedName)){
            this.mappingNameIndex[newEntityNode.normalisedName] = []
        }
        this.mappingNameIndex[newEntityNode.normalisedName].push(thisObject.nodes.length-1);
        
        if (!this.mappingEntityNameIndex.hasOwnProperty(newEntityNode.normalisedName)){
            this.mappingEntityNameIndex[newEntityNode.normalisedName] = []
        }
        this.mappingEntityNameIndex[newEntityNode.normalisedName].push(thisObject.nodes.length-1);
        
        this.mappingModelElementIndex[newEntityNode.modelElement] = [thisObject.nodes.length-1];
}

dataForForceBased.prototype.getNodes = function(){
	return this.nodes;
}

dataForForceBased.prototype.getWeights = function(){
	return this.weights;
}

dataForForceBased.prototype.getReducedNodes = function(){
	return this.reducedNodes;
}

dataForForceBased.prototype.getReducedWeights = function(){
	return this.reducedWeights;
}

dataForForceBased.prototype.getReducedNodes2 = function(){
    if (this.hasOwnProperty("reducedNodes2")){
        return this.reducedNodes2;
    }
    else{
        console.log("reduced nodes2 was expected but not found")
        return this.reducedNodes;
    }
}

dataForForceBased.prototype.getReducedWeights2 = function(){
	
    if (this.hasOwnProperty("reducedNodes2")){
        return this.reducedWeights2;
    }
    else{
        console.log("reduced weights2 was expected but not found")
        return this.reducedWeights;
    }
}

dataForForceBased.prototype.getNodeRange = function(){
	
	return [this.globalMin,this.globalMax];
}

dataForForceBased.prototype.getWeightRange = function(){
	
	return [0,1];
}
dataForForceBased.prototype.filterNormNameAndHop = function(normName, hops){
    //Not used for now. If resumed it should make use of reducedNodes2
    
    this.reducedNodes = [];
    this.reducedWeights = [];
    this.alreadyAdded = {};
    var thisObject = this;
    
    var indexesInNodes = thisObject.mappingNameIndex[normName];
    recursiveFiltering(indexesInNodes, hops);
    
    function recursiveFiltering(indexes, hops){
        indexes.forEach(function(indexInNodes){
            if (!thisObject.alreadyAdded.hasOwnProperty(indexInNodes)){
                thisObject.alreadyAdded[indexInNodes] = 1;
                thisObject.reducedNodes.push(thisObject.nodes[indexInNodes]);
                if (hops >= 1){
                    //thisObject.nodes[indexInNodes].connected.forEach(function(connectedIdx){
                        //var newName = thisObject.nodes[connectedIdx].normalisedName;
                    recursiveFiltering(thisObject.nodes[indexInNodes].connected, hops - 1);
                    //});
                    thisObject.nodes[indexInNodes].connectedLinkIndex.forEach(function(connectedLinkIdx){
                        thisObject.reducedWeights.push(thisObject.weights[connectedLinkIdx]);
                    });
                }
            }
        })
    }    
}

dataForForceBased.prototype.nodeZoom = function(id, vizObject){

    var nodeFound = this.nodes[this.mappingIndexName[id]];
    //get coordinates
    p1 = [nodeFound.x, nodeFound.y];
    
    vizObject.changeClassToNode(nodeFound,"nodeSearched");
    
    //assign width of zoom
    p1.push(200);
    
    //call zoom
    vizObject.zoomOnAndOff([],p1)
}

dataForForceBased.prototype.filterEventRoleEntity = function(eventNames, roles, entityNames, booleanAnd){
    this.reducedNodes = [];    
    this.auxNodes = [];
    this.reducedWeights = [];
    this.alreadyAddedNode = {};
    this.alreadyAddedLink = {};
    
    var thisObject = this;
    var eventIndexes;
    
    //Iterate over the number of queries
    eventNames.forEach(function(eventName, queryIndex){
        eventIndexes = [];
        thisObject.alreadyAddedNodeAux = {};
        thisObject.alreadyAddedLinkAux = {};
        thisObject.reducedNodesAux = [];
        thisObject.reducedWeightsAux = [];
        
        if (eventName == ''){
            //Get all event indexes
            allEventNames = Object.keys(thisObject.mappingEventNameIndex);
            allEventNames.forEach(function(name){
                eventIndexes = eventIndexes.concat(thisObject.mappingEventNameIndex[name]);
            });
        }
        else{
            //Get event indexes with the event given in the query
            if (thisObject.mappingEventNameIndex.hasOwnProperty(eventName)){
                eventIndexes = thisObject.mappingEventNameIndex[eventName];
            }
            
        }
        //If it found at least one event matching the i-th query
        if (eventIndexes.length>0){
            //For each event matching the query
            eventIndexes.forEach(function(evIdx){
            
                eventNodeFound = thisObject.nodes[evIdx];
if (eventNodeFound.modelElement=="extension_event_3696"){
    a=1;
}                
                addAllArguments = false;
                eventNodeFound.connectedLinkIndex.forEach(function(connectedLinkIdx){
                    //Check if the role is in the query
                    if ((roles[queryIndex] == '')||(thisObject.weights[connectedLinkIdx].role == roles[queryIndex])){
                        
                        //Check if the entity is in the query
                        if ((entityNames[queryIndex] == '') || (entityNames[queryIndex] == thisObject.weights[connectedLinkIdx].target.normalisedName)){
                            addAllArguments = true;
                        }
                    }
                });
                //If matching events and arguments were found
                if (addAllArguments){
                    //For each matching event node

                    eventNodeFound.connectedLinkIndex.forEach(function(connectedLinkIdx){
                        //Update connections of reduced nodes for the event node
                        thisObject.checkAndAddReducedConnected(thisObject.weights[connectedLinkIdx].source, thisObject.weights[connectedLinkIdx].target);
                        
                        //Update connections of reduced nodes for the entity node
                        thisObject.checkAndAddReducedConnected(thisObject.weights[connectedLinkIdx].target, thisObject.weights[connectedLinkIdx].source);
                        
                        //Add event node and check that it has not been added before
                        if (!thisObject.alreadyAddedNodeAux.hasOwnProperty(thisObject.weights[connectedLinkIdx].source.id)){
                            thisObject.reducedNodesAux.push(thisObject.weights[connectedLinkIdx].source);
                            //Mark node as added
                            thisObject.alreadyAddedNodeAux[thisObject.weights[connectedLinkIdx].source.id] = thisObject.weights[connectedLinkIdx].source;                            
                        }
                        
                        //Add entity node and check that it has not been added before
                        if (!thisObject.alreadyAddedNodeAux.hasOwnProperty(thisObject.weights[connectedLinkIdx].target.id)){
                            thisObject.reducedNodesAux.push(thisObject.weights[connectedLinkIdx].target);
                            //Mark node as added                                
                            thisObject.alreadyAddedNodeAux[thisObject.weights[connectedLinkIdx].target.id] = thisObject.weights[connectedLinkIdx].target;
                        
                        }
                        
                        //if (!thisObject.alreadyAddedLinkAux.hasOwnProperty(thisObject.weights[connectedLinkIdx].source.id+"-"+thisObject.weights[connectedLinkIdx].target.id)){
                            //Add link
                            thisObject.reducedWeightsAux.push(thisObject.weights[connectedLinkIdx])
                            //Mark link as added
                            thisObject.alreadyAddedLinkAux[thisObject.weights[connectedLinkIdx].source.id+"-"+thisObject.weights[connectedLinkIdx].target.id] = thisObject.weights[connectedLinkIdx];
                            
                            //update connections of added links
                            
                            /*
                            thisObject.checkAndAddReducedConnectedLinkIndex(thisObject.weights[connectedLinkIdx].source, thisObject.weights[connectedLinkIdx].target);
                            thisObject.checkAndAddReducedConnectedLinkIndex(thisObject.weights[connectedLinkIdx].target, thisObject.weights[connectedLinkIdx].source);
                            */
                            
                            
                        //}
                    });
                }
            });
        }
        if (queryIndex>0){
            //There are various query terms
            if (booleanAnd[queryIndex]){
                //boolean AND is desired
                
                //Save id of reducedNodes
                reducedNodesOldid = get_id(thisObject.reducedNodes)
                
                thisObject.reducedNodes = [];
                thisObject.alreadyAddedNodeAux = {};
                //Get nodes that appear in the new query (reducedNodesAux) and the older queries (reducedNodes)
                thisObject.reducedNodesAux.forEach(function(nodeAux){
                    if (thisObject.alreadyAddedNode.hasOwnProperty(nodeAux.id)){
                        thisObject.reducedNodes.push(nodeAux);
                        thisObject.alreadyAddedNodeAux[nodeAux.id] = nodeAux;
                    }
                    else{
                        //add the node not considered for the current query to the list of nodes to eliminate from the reduced connections
                        reducedNodesOldid.push(nodeAux.id);
                    }
                });
                thisObject.alreadyAddedNode = clone(thisObject.alreadyAddedNodeAux);
                
                //Remove connections eliminated by the AND
                reducedNodesNewid = get_id(thisObject.reducedNodes);
                thisObject.removeConnectionsOfRemovedNodes(reducedNodesOldid, reducedNodesNewid);

                //Save id of reducedWeights
                //reducedLinksOldid = getLink_id(thisObject.reducedWeights)
                
                thisObject.reducedWeights = []
                thisObject.alreadyAddedLinkAux = {}
                //Get links that appear in the new query (reducedWeightsAux) and the older queries (reducedWeights) but have not been added before
                thisObject.reducedWeightsAux.forEach(function(linkAux){
                    if ((thisObject.alreadyAddedLink.hasOwnProperty(linkAux.source.id+"-"+linkAux.target.id))&&(!thisObject.alreadyAddedLinkAux.hasOwnProperty(linkAux.source.id+"-"+linkAux.target.id))){
                        thisObject.reducedWeights.push(linkAux);
                        thisObject.alreadyAddedLinkAux[linkAux.source.id+"-"+linkAux.target.id] = linkAux;
                    }
                    //reducedLinksOldid.push(linkAux.source.id+"-"+linkAux.target.id);
                });
                thisObject.alreadyAddedLink = clone(thisObject.alreadyAddedLinkAux);
                
                //Remove connections eliminated by the AND
                /*reducedLinksNewid = getLink_id(thisObject.reducedWeights);
                thisObject.removeConnectionsOfRemovedNodes(reducedWeights, reducedLinksOldid, reducedLinksNewid);*/
                
                //We need to filter the singleton nodes (these are useful as suggestions!!!)
                var indexesToRemove = []
                thisObject.reducedNodes.forEach(function(nodeAux,idx){
                    //Check if link is present
                    if (nodeAux.reducedConnected.length == 0){
                        //Save index to remove
                        indexesToRemove.push(idx);
                        delete thisObject.alreadyAddedNode[nodeAux.id];
                    }
                });
                indexesToRemove.reverse().forEach(function(elem){
                    thisObject.reducedNodes.splice(elem,1);
                });
                //Remove already added nodes
                
            }
            else{
                //Or is desired
                thisObject.reducedNodesAux.forEach(function(nodeAux){
                    if (!thisObject.alreadyAddedNode.hasOwnProperty(nodeAux.id)){
                        thisObject.reducedNodes.push(nodeAux);
                        thisObject.alreadyAddedNode[nodeAux.id] = nodeAux;
                    }
                });
                thisObject.reducedWeightsAux.forEach(function(linkAux){
                    if (!thisObject.alreadyAddedLink.hasOwnProperty(linkAux.source.id+"-"+linkAux.target.id)){
                        thisObject.reducedWeights.push(linkAux);
                        thisObject.alreadyAddedLink[linkAux.source.id+"-"+linkAux.target.id] = linkAux;
                    }
                });
            }
        }
        else{
            thisObject.reducedNodes = thisObject.reducedNodesAux.slice(0);
            thisObject.reducedWeights = thisObject.reducedWeightsAux.slice(0);
            thisObject.alreadyAddedNode = clone(thisObject.alreadyAddedNodeAux);
            thisObject.alreadyAddedLink = clone(thisObject.alreadyAddedLinkAux);
        }
    });
}

function getxmi_id(nodesArray){
    return nodesArray.map(function(elem){return elem.xmi_id});
}
function get_id(nodesArray){
    return nodesArray.map(function(elem){return elem.id});
}

function getLinkxmi_id(weightsArray){
   //not used
    return weightsArray.map(function(elem){return elem.source.xmi_id + "-" + elem.target.xmi_id});
}

function getLink_id(weightsArray){
   //not used
    return weightsArray.map(function(elem){return elem.source.id + "-" + elem.target.id});
}


dataForForceBased.prototype.removeConnectionsOfRemovedNodes = function(oldIds, newIds){
    thisObject = this;
    
    //Go through all possibly filtered nodes after a succesive query
    oldIds.forEach(function(elemOld){
        if (newIds.indexOf(elemOld)<0){
            //elemOld is not there anymore
            anyoneLinkingToOldId = false;
           
            //get nodes connecting to oldId
            thisObject.nodes[thisObject.mappingIndexName[elemOld]].connected.forEach(function(connectedIdxDissapear){
                if (thisObject.nodes[connectedIdxDissapear].hasOwnProperty("reducedConnected")){
                    //Remove those from the connections of the reduced graph
                    var index = thisObject.nodes[connectedIdxDissapear].reducedConnected.indexOf(elemOld);
                    if (index > -1){
                        thisObject.nodes[connectedIdxDissapear].reducedConnected.splice(index,1)
                    }
                }
           });           
       }
    });
}

dataForForceBased.prototype.checkAndAddReducedConnected = function (nodeCurrent, nodePointing){
    //Check whether we added these nodes before
    if (this.alreadyAddedNode.hasOwnProperty(nodeCurrent.id)||this.alreadyAddedNodeAux.hasOwnProperty(nodeCurrent.id)){
        //check that what we are pointing to wasn't added before
        if (nodeCurrent.reducedConnected.indexOf(nodePointing.id)<0){
            nodeCurrent.reducedConnected.push(nodePointing.id);
        }
    }
    else{
        //even if there was a connection, it was an old one, so the array needs to be reset
        nodeCurrent.reducedConnected = [nodePointing.id];
    }

}

dataForForceBased.prototype.checkAndAddReducedConnectedLinkIndex = function (nodeCurrent, nodePointing){
//Not used for now. The idea was to keep a record of the active links in the reduced graph    
    //Check if nodeCurrent has been already added as reducedNodes
    if (this.alreadyAddedLink.hasOwnProperty(nodeCurrent.id)){
        nodeCurrent.reducedConnectedLinkIndex.push(nodePointing.id);
    }
    else{
        //even if there was a connection, it was an old one, so the array needs to be reset
        nodeCurrent.reducedConnectedLinkIndex = [nodePointing.id];
    }
}

dataForForceBased.prototype.expandNode = function(id){
    var thisObject = this;
    eventNodeFound = thisObject.nodes[thisObject.mappingIndexName[id]];
                
    eventNodeFound.connectedLinkIndex.forEach(function(connectedLinkIdx){
        //Add event node and check that it has not been added before
        //reducedNodes is used here because it then goes to filtering
            if (!thisObject.alreadyAddedNode.hasOwnProperty(thisObject.weights[connectedLinkIdx].source.id)){
                thisObject.reducedNodes.push(thisObject.weights[connectedLinkIdx].source);
                //Mark node as added
                thisObject.alreadyAddedNode[thisObject.weights[connectedLinkIdx].source.id] = 1;
                //console.log("I should expand more if events cannot be alone")
                thisObject.expandNode(thisObject.weights[connectedLinkIdx].source.id);
            }
            
            //Add entity node and check that it has not been added before
            if (!thisObject.alreadyAddedNode.hasOwnProperty(thisObject.weights[connectedLinkIdx].target.id)){
                thisObject.reducedNodes.push(thisObject.weights[connectedLinkIdx].target);
                //Mark node as added                                
                thisObject.alreadyAddedNode[thisObject.weights[connectedLinkIdx].target.id] = 1;

            }
            if (!thisObject.alreadyAddedLink.hasOwnProperty(thisObject.weights[connectedLinkIdx].source.id+"-"+thisObject.weights[connectedLinkIdx].target.id)){
                //Add link
                thisObject.reducedWeights.push(thisObject.weights[connectedLinkIdx])
                //Mark link as added
                thisObject.alreadyAddedLink[thisObject.weights[connectedLinkIdx].source.id+"-"+thisObject.weights[connectedLinkIdx].target.id] = 1;
                
                //if the link was added then it also needs to update the current connections
                if (thisObject.weights[connectedLinkIdx].source.hasOwnProperty("reducedConnected")){
                    thisObject.weights[connectedLinkIdx].source.reducedConnected.push(thisObject.weights[connectedLinkIdx].target.id);
                }
                else{
                    thisObject.weights[connectedLinkIdx].source.reducedConnected = [thisObject.weights[connectedLinkIdx].target.id];
                }
                if (thisObject.weights[connectedLinkIdx].target.hasOwnProperty("reducedConnected")){
                    thisObject.weights[connectedLinkIdx].target.reducedConnected.push(thisObject.weights[connectedLinkIdx].source.id);
                }
                else{
                    thisObject.weights[connectedLinkIdx].target.reducedConnected = [thisObject.weights[connectedLinkIdx].source.id];
                }
            }
    });
}

dataForForceBased.prototype.collapseNode = function(id){
    //This needs to be implemented!!!!
    var thisObject = this;
    eventNodeFound = thisObject.nodes[thisObject.mappingIndexName[id]];
                
    eventNodeFound.connectedLinkIndex.forEach(function(connectedLinkIdx){
        //Add event node and check that it has not been added before
        //reducedNodes is used here because it then goes to filtering
            if (!thisObject.alreadyAddedNode.hasOwnProperty(thisObject.weights[connectedLinkIdx].source.id)){
                thisObject.reducedNodes.push(thisObject.weights[connectedLinkIdx].source);
                //Mark node as added
                thisObject.alreadyAddedNode[thisObject.weights[connectedLinkIdx].source.id] = 1;
                //console.log("I should expand more if events cannot be alone")
                thisObject.expandNode(thisObject.weights[connectedLinkIdx].source.id);
            }
            
            //Add entity node and check that it has not been added before
            if (!thisObject.alreadyAddedNode.hasOwnProperty(thisObject.weights[connectedLinkIdx].target.id)){
                thisObject.reducedNodes.push(thisObject.weights[connectedLinkIdx].target);
                //Mark node as added                                
                thisObject.alreadyAddedNode[thisObject.weights[connectedLinkIdx].target.id] = 1;

            }
            if (!thisObject.alreadyAddedLink.hasOwnProperty(thisObject.weights[connectedLinkIdx].source.id+"-"+thisObject.weights[connectedLinkIdx].target.id)){
                //Add link
                thisObject.reducedWeights.push(thisObject.weights[connectedLinkIdx])
                //Mark link as added
                thisObject.alreadyAddedLink[thisObject.weights[connectedLinkIdx].source.id+"-"+thisObject.weights[connectedLinkIdx].target.id] = 1;
                
                //if the link was added then it also needs to update the current connections
                if (thisObject.weights[connectedLinkIdx].source.hasOwnProperty("reducedConnected")){
                    thisObject.weights[connectedLinkIdx].source.reducedConnected.push(thisObject.weights[connectedLinkIdx].target.id);
                }
                else{
                    thisObject.weights[connectedLinkIdx].source.reducedConnected = [thisObject.weights[connectedLinkIdx].target.id];
                }
                if (thisObject.weights[connectedLinkIdx].target.hasOwnProperty("reducedConnected")){
                    thisObject.weights[connectedLinkIdx].target.reducedConnected.push(thisObject.weights[connectedLinkIdx].source.id);
                }
                else{
                    thisObject.weights[connectedLinkIdx].target.reducedConnected = [thisObject.weights[connectedLinkIdx].source.id];
                }
            }
    });
    
    //This is where the links and nodes are fitered if the confidence is below a threshold
    this.reducedNodes2 = [];
    this.reducedWeights2 = [];
    this.alreadyAdded2 = {};
    this.alreadyAddedLink = {};
    var thisObject = this;
    
    
    this.reducedWeights.forEach(function(w){
        if ((w.value <= maxValue) && (w.value >= minValue)){
            //weight is within the boundaries
            thisObject.reducedWeights2.push(w);
            thisObject.alreadyAddedLink[w.source.id+"-"+w.target.id]=w;
            if (!thisObject.alreadyAdded2.hasOwnProperty(w.source.id)){
                thisObject.alreadyAdded2[w.source.id] = w.source;
                thisObject.reducedNodes2.push(w.source);
            }
            if (!thisObject.alreadyAdded2.hasOwnProperty(w.target.id)){
                thisObject.alreadyAdded2[w.target.id] = w.target;
                thisObject.reducedNodes2.push(w.target);
            }
            
            indexxid = w.source.reducedConnected.indexOf(w.target.id);
            if (indexxid<0){
                w.source.reducedConnected.push(w.target.id);
            }
            
            indexxid = w.target.reducedConnected.indexOf(w.source.id);
            if (indexxid<0){
                w.target.reducedConnected.push(w.source.id);
            }
            
        }
        else{
            /*
            idConnected = [w.source.id,w.target.id];
            idConnected.forEach(function(xxid){
                */
                indexxid = w.source.reducedConnected.indexOf(w.target.id);
                if (indexxid>=0){
                    w.source.reducedConnected.splice(indexxid,1);
                }
                indexxid = w.target.reducedConnected.indexOf(w.source.id);
                if (indexxid>=0){                
                    w.target.reducedConnected.splice(indexxid,1);
                }
            /*
            })*/
        }
    });
}

dataForForceBased.prototype.filterEventRoleEntity_old = function(eventNames, roles, entityNames, booleanAnd){
    //The difference with the new version is that in each query part of the relationship could be retrieved (e.g. an event with one entity only)
    this.reducedNodes = [];    
    this.auxNodes = [];
    this.reducedWeights = [];
    this.alreadyAddedNode = {};
    this.alreadyAddedLink = {};
    
    var thisObject = this;
    var eventIndexes = [];
    
    eventNames.forEach(function(eventName, queryIndex){
        thisObject.alreadyAddedNodeAux = {};
        thisObject.alreadyAddedLinkAux = {};
        thisObject.reducedNodesAux = [];
        thisObject.reducedWeightsAux = [];
        
        if (eventName == ''){
            //Get all event indexes
            allEventNames = Object.keys(thisObject.mappingEventNameIndex);
            allEventNames.forEach(function(name){
                eventIndexes = eventIndexes.concat(thisObject.mappingEventNameIndex[name]);
            });
        }
        else{
            //Get event indexes with the event given in the query
            if (thisObject.mappingEventNameIndex.hasOwnProperty(eventName)){
                eventIndexes = thisObject.mappingEventNameIndex[eventName];
            }
        }
        if (eventIndexes.length>0){
            eventIndexes.forEach(function(evIdx){
            
                eventNodeFound = thisObject.nodes[evIdx];
                    
                eventNodeFound.connectedLinkIndex.forEach(function(connectedLinkIdx){
                    //Check if the role is in the query
                    if ((roles[queryIndex] == '')||(thisObject.weights[connectedLinkIdx].role == roles[queryIndex])){
                        
                        //Check if the entity is in the query
                        if ((entityNames[queryIndex] == '') || (entityNames[queryIndex] == thisObject.weights[connectedLinkIdx].target.normalisedName)){
                            
                            //Add event node and check that it has not been added before
                            if (!thisObject.alreadyAddedNodeAux.hasOwnProperty(thisObject.weights[connectedLinkIdx].source.id)){
                                thisObject.reducedNodesAux.push(thisObject.weights[connectedLinkIdx].source);
                                //Mark node as added
                                thisObject.alreadyAddedNodeAux[thisObject.weights[connectedLinkIdx].source.id] = 1;
                            }
                            
                            //Add entity node and check that it has not been added before
                            if (!thisObject.alreadyAddedNodeAux.hasOwnProperty(thisObject.weights[connectedLinkIdx].target.id)){
                                thisObject.reducedNodesAux.push(thisObject.weights[connectedLinkIdx].target);
                                //Mark node as added                                
                                thisObject.alreadyAddedNodeAux[thisObject.weights[connectedLinkIdx].target.id] = 1;
                            }
                            //Add link
                            thisObject.reducedWeightsAux.push(thisObject.weights[connectedLinkIdx])
                            //Mark link as added
                            thisObject.alreadyAddedLinkAux[thisObject.weights[connectedLinkIdx].source.id+"-"+thisObject.weights[connectedLinkIdx].target.id] = 1;
                            
                        }
                    }
                });
                
            });
        }
        if (queryIndex>0){
            //There are various query terms
            if (booleanAnd){
                //And is desired
                thisObject.reducedNodes = [];
                thisObject.alreadyAddedNodeAux = {};
                thisObject.reducedNodesAux.forEach(function(nodeAux){
                    if (thisObject.alreadyAddedNode.hasOwnProperty(nodeAux.id)){
                        thisObject.reducedNodes.push(nodeAux);
                        thisObject.alreadyAddedNodeAux[nodeAux.id] = 1;
                    }
                });
                thisObject.alreadyAddedNode = clone(thisObject.alreadyAddedNodeAux);

                thisObject.reducedWeights = []
                thisObject.alreadyAddedLinkAux = {}
                thisObject.reducedWeightsAux.forEach(function(linkAux){
                    if (thisObject.alreadyAddedLink.hasOwnProperty(linkAux.source.id+"-"+linkAux.target.id)){
                        thisObject.reducedWeights.push(linkAux);
                        thisObject.alreadyAddedLinkAux[linkAux.source.id+"-"+linkAux.target.id] = 1;
                    }
                });
                thisObject.alreadyAddedLink = clone(thisObject.alreadyAddedLinkAux);
                
            }
            else{
                //Or is desired
                thisObject.reducedNodesAux.forEach(function(nodeAux){
                    if (!thisObject.alreadyAddedNode.hasOwnProperty(nodeAux.id)){
                        thisObject.reducedNodes.push(nodeAux);
                        thisObject.alreadyAddedNode[nodeAux.id] = 1;
                    }
                });
                thisObject.reducedWeightsAux.forEach(function(linkAux){
                    if (!thisObject.alreadyAddedLink.hasOwnProperty(linkAux.source.id+"-"+linkAux.target.id)){
                        thisObject.reducedWeights.push(linkAux);
                        thisObject.alreadyAddedLink[linkAux.source.id+"-"+linkAux.target.id] = 1;
                    }
                });
            }
        }
        else{
            thisObject.reducedNodes = thisObject.reducedNodesAux.slice(0);
            thisObject.reducedWeights = thisObject.reducedWeightsAux.slice(0);
            thisObject.alreadyAddedNode = clone(thisObject.alreadyAddedNodeAux);
            thisObject.alreadyAddedLink = clone(thisObject.alreadyAddedLinkAux);
        }
    });
}

dataForForceBased.prototype.filterLinkConfidence = function(minValue, maxValue){
    //This is where the links and nodes are fitered if the confidence is below a threshold
    this.reducedNodesAux = [];
    this.reducedWeightsAux = [];
    this.alreadyAdded2Aux = {};
    this.alreadyAddedLinkAux = {};
    var thisObject = this;
    
    
    this.reducedWeights.forEach(function(w){
        if ((Math.abs(w.value) <= maxValue) && (Math.abs(w.value) >= minValue)){
            //weight is within the boundaries
            thisObject.reducedWeightsAux.push(w);
            thisObject.alreadyAddedLinkAux[w.source.id+"-"+w.target.id]=w;
            if (!thisObject.alreadyAdded2Aux.hasOwnProperty(w.source.id)){
                thisObject.alreadyAdded2Aux[w.source.id] = w.source;
                thisObject.reducedNodesAux.push(w.source);
            }
            if (!thisObject.alreadyAdded2Aux.hasOwnProperty(w.target.id)){
                thisObject.alreadyAdded2Aux[w.target.id] = w.target;
                thisObject.reducedNodesAux.push(w.target);
            }
            
            indexxid = w.source.reducedConnected.indexOf(w.target.id);
            if (indexxid<0){
                w.source.reducedConnected.push(w.target.id);
            }
            
            indexxid = w.target.reducedConnected.indexOf(w.source.id);
            if (indexxid<0){
                w.target.reducedConnected.push(w.source.id);
            }
            
        }
        else{
            /*
            idConnected = [w.source.id,w.target.id];
            idConnected.forEach(function(xxid){
                */
                indexxid = w.source.reducedConnected.indexOf(w.target.id);
                if (indexxid>=0){
                    w.source.reducedConnected.splice(indexxid,1);
                }
                indexxid = w.target.reducedConnected.indexOf(w.source.id);
                if (indexxid>=0){                
                    w.target.reducedConnected.splice(indexxid,1);
                }
            /*
            })*/
        }
    });
    //clone doesnot work because it messes the links up
    //this.reducedNodes = clone(this.reducedNodes2);
    //this.reducedWeights = clone(this.reducedWeights2);
    
    //this.reducedNodes = this.reducedNodes2;    
    //this.reducedWeights = this.reducedWeights2;
    
    //this.alreadyAddedNode = this.alreadyAdded2;
    
    //In case no further filtering is applied
    
    
}


dataForForceBased.prototype.filterBasedOnTextEvidence = function(discoveryOn){
    
    
    if (discoveryOn){
        //Show nodes and weights as they were from the previous function (filterLinkConfidence)
        this.reducedNodes2TextEvid = this.reducedNodesAux.slice(0);
        //this.reducedWeightsAux = this.reducedWeights2.slice(0);
        this.reducedWeights2TextEvid = this.reducedWeightsAux.slice(0);
        
        this.alreadyAdded2TextEvid = Object.assign({},this.alreadyAdded2Aux);
        this.alreadyAddedLinkTextEvid = Object.assign({},this.alreadyAddedLinkAux);
        
        //Fix the reducedConnected for those weights not in the model
        this.reducedWeights2TextEvid.forEach(function(w){
            if (!w.inModel){
                //update reducedConnected for nodes in case they were removed (add them back)
                indexxid = w.source.reducedConnected.indexOf(w.target.id);
                if (indexxid<0){
                    w.source.reducedConnected.push(w.target.id);
                }
                
                indexxid = w.target.reducedConnected.indexOf(w.source.id);
                if (indexxid<0){
                    w.target.reducedConnected.push(w.source.id);
                }
                
            }
        });
        
    }
    else{
        //Do not include weights and nodes that are not in the model
        //this.reducedNodesAux = this.reducedNodes2.slice(0);
        this.reducedNodes2TextEvid = [];
        //this.reducedWeightsAux = this.reducedWeights2.slice(0);
        this.reducedWeights2TextEvid = [];
        
        this.alreadyAdded2TextEvid = {};
        this.alreadyAddedLinkTextEvid = {};
        
        var thisObject = this;
        
        
        this.reducedWeightsAux.forEach(function(w){
            if (w.inModel){
                //event was present in the model, so entity nodes must be in the model as well
                thisObject.reducedWeights2TextEvid.push(w);
                thisObject.alreadyAddedLinkTextEvid[w.source.id+"-"+w.target.id]=w;
                if (!thisObject.alreadyAdded2TextEvid.hasOwnProperty(w.source.id)){
                    thisObject.alreadyAdded2TextEvid[w.source.id] = w.source;
                    thisObject.reducedNodes2TextEvid.push(w.source);
                }
                if (!thisObject.alreadyAdded2TextEvid.hasOwnProperty(w.target.id)){
                    thisObject.alreadyAdded2TextEvid[w.target.id] = w.target;
                    thisObject.reducedNodes2TextEvid.push(w.target);
                }
                
                indexxid = w.source.reducedConnected.indexOf(w.target.id);
                if (indexxid<0){
                    w.source.reducedConnected.push(w.target.id);
                }
                
                indexxid = w.target.reducedConnected.indexOf(w.source.id);
                if (indexxid<0){
                    w.target.reducedConnected.push(w.source.id);
                }
                
            }
            else{
                /*
                idConnected = [w.source.id,w.target.id];
                idConnected.forEach(function(xxid){
                    */
                    indexxid = w.source.reducedConnected.indexOf(w.target.id);
                    if (indexxid>=0){
                        w.source.reducedConnected.splice(indexxid,1);
                    }
                    indexxid = w.target.reducedConnected.indexOf(w.source.id);
                    if (indexxid>=0){                
                        w.target.reducedConnected.splice(indexxid,1);
                    }
                /*
                })*/
            }
        });
    }
}

dataForForceBased.prototype.filterBasedOnPolarity = function(showNegPolarityOn){
    
    
    if (showNegPolarityOn){
        //Show nodes and weights as they were from the previous function (filterLinkConfidence and filterBasedOnTextEvidence)
        this.reducedNodes2Polarity = this.reducedNodes2TextEvid.slice(0);
        
        this.reducedWeights2Polarity = this.reducedWeights2TextEvid.slice(0);
        
        this.alreadyAdded2Polarity = Object.assign({},this.alreadyAdded2TextEvid);
        this.alreadyAddedLinkPolarity = Object.assign({},this.alreadyAddedLinkTextEvid);
        
        //Fix the reducedConnected for those weights not in the model
        this.reducedWeights2Polarity.forEach(function(w){
            if (w.source.tagName=="Event"?(w.source.polarity<0):(w.target.polarity < 0)){
                //event was present in the model, so entity nodes must be in the model as well
                indexxid = w.source.reducedConnected.indexOf(w.target.id);
                if (indexxid<0){
                    w.source.reducedConnected.push(w.target.id);
                }
                
                indexxid = w.target.reducedConnected.indexOf(w.source.id);
                if (indexxid<0){
                    w.target.reducedConnected.push(w.source.id);
                }
                
            }
        });
        
    }
    else{
        //Do not include weights and nodes that are not in the model        
        this.reducedNodes2Polarity = [];
        this.reducedWeights2Polarity = [];
        
        this.alreadyAdded2Polarity = {};
        this.alreadyAddedLinkPolarity = {};
        
        var thisObject = this;
        
        
        this.reducedWeights2TextEvid.forEach(function(w){
            if (w.source.tagName=="Event"?(w.source.polarity>=0):(w.target.polarity >= 0)){
                //event was present in the model, so entity nodes must be in the model as well
                thisObject.reducedWeights2Polarity.push(w);
                thisObject.alreadyAddedLinkPolarity[w.source.id+"-"+w.target.id]=w;
                if (!thisObject.alreadyAdded2Polarity.hasOwnProperty(w.source.id)){
                    thisObject.alreadyAdded2Polarity[w.source.id] = w.source;
                    thisObject.reducedNodes2Polarity.push(w.source);
                }
                if (!thisObject.alreadyAdded2Polarity.hasOwnProperty(w.target.id)){
                    thisObject.alreadyAdded2Polarity[w.target.id] = w.target;
                    thisObject.reducedNodes2Polarity.push(w.target);
                }
                
                indexxid = w.source.reducedConnected.indexOf(w.target.id);
                if (indexxid<0){
                    w.source.reducedConnected.push(w.target.id);
                }
                
                indexxid = w.target.reducedConnected.indexOf(w.source.id);
                if (indexxid<0){
                    w.target.reducedConnected.push(w.source.id);
                }
                
            }
            else{
                /*
                idConnected = [w.source.id,w.target.id];
                idConnected.forEach(function(xxid){
                    */
                    indexxid = w.source.reducedConnected.indexOf(w.target.id);
                    if (indexxid>=0){
                        w.source.reducedConnected.splice(indexxid,1);
                    }
                    indexxid = w.target.reducedConnected.indexOf(w.source.id);
                    if (indexxid>=0){                
                        w.target.reducedConnected.splice(indexxid,1);
                    }
                /*
                })*/
            }
        });
    }
    /*
    this.reducedNodes2 = this.reducedNodes2Polarity;    
    this.reducedWeights2 = this.reducedWeights2Polarity;
    
    this.alreadyAdded2 = this.alreadyAdded2Polarity;
    this.alreadyAddedLink = this.alreadyAddedLinkPolarity;
    */
}

dataForForceBased.prototype.filterBasedOnWhiteBlackList = function(whiteList, blackList){
    var thisObject = this;
    if ((whiteList.length==0) && (blackList.length==0)){
        //Show nodes and weights as they were from the previous function (filterLinkFusion)
        this.reducedNodes2WBListed = this.reducedNodes2Polarity.slice(0);
        
        this.reducedWeights2WBListed = this.reducedWeights2Polarity.slice(0);
        
        this.alreadyAdded2WBListed = Object.assign({},this.alreadyAdded2Polarity);
        this.alreadyAddedLinkWBListed = Object.assign({},this.alreadyAddedLinkPolarity);
        
        //Fix the reducedConnected for those weights not in the model
        this.reducedWeights2WBListed.forEach(function(w){
            if (!shouldWeightBeAllowed(w,thisObject.previousWhiteList,thisObject.previousBlackList)){
                //event was removed 
                indexxid = w.source.reducedConnected.indexOf(w.target.id);
                if (indexxid<0){
                    w.source.reducedConnected.push(w.target.id);
                }
                
                indexxid = w.target.reducedConnected.indexOf(w.source.id);
                if (indexxid<0){
                    w.target.reducedConnected.push(w.source.id);
                }
            }
        });
        
    }
    else{
        this.previousBlackList = blackList.slice(0);
        this.previousWhiteList = whiteList.slice(0);
        
        //Do not include weights and nodes that are part of the blackList or that are not part of the whitelist        
        this.reducedNodes2WBListed = [];
        this.reducedWeights2WBListed = [];
        
        this.alreadyAdded2WBListed = {};
        this.alreadyAddedLinkWBListed = {};
        
        var thisObject = this;
        
        
        this.reducedWeights2Polarity.forEach(function(w){
            if (shouldWeightBeAllowed(w,whiteList,blackList)){
                //event was present in the model, so entity nodes must be in the model as well
                thisObject.reducedWeights2WBListed.push(w);
                thisObject.alreadyAddedLinkWBListed[w.source.id+"-"+w.target.id]=w;
                if (!thisObject.alreadyAdded2WBListed.hasOwnProperty(w.source.id)){
                    thisObject.alreadyAdded2WBListed[w.source.id] = w.source;
                    thisObject.reducedNodes2WBListed.push(w.source);
                }
                if (!thisObject.alreadyAdded2WBListed.hasOwnProperty(w.target.id)){
                    thisObject.alreadyAdded2WBListed[w.target.id] = w.target;
                    thisObject.reducedNodes2WBListed.push(w.target);
                }
                
                indexxid = w.source.reducedConnected.indexOf(w.target.id);
                if (indexxid<0){
                    w.source.reducedConnected.push(w.target.id);
                }
                
                indexxid = w.target.reducedConnected.indexOf(w.source.id);
                if (indexxid<0){
                    w.target.reducedConnected.push(w.source.id);
                }
                
            }
            else{
                /*
                idConnected = [w.source.id,w.target.id];
                idConnected.forEach(function(xxid){
                    */
                    indexxid = w.source.reducedConnected.indexOf(w.target.id);
                    if (indexxid>=0){
                        w.source.reducedConnected.splice(indexxid,1);
                    }
                    indexxid = w.target.reducedConnected.indexOf(w.source.id);
                    if (indexxid>=0){                
                        w.target.reducedConnected.splice(indexxid,1);
                    }
                /*
                })*/
            }
        });
    }
    /*
    this.reducedNodes2 = this.reducedNodes2WBListed;    
    this.reducedWeights2 = this.reducedWeights2WBListed;
    
    this.alreadyAdded2 = this.alreadyAdded2WBListed;
    this.alreadyAddedLink = this.alreadyAddedLinkWBListed;
    */
    
    function shouldWeightBeAllowed(w,whiteList,blackList){
        var out = true;
        var otherConnectingEntity;
        if ((whiteList.length==0) && (blackList.length==0)){
            return out;
        }
        else{
             w.source.connected.forEach(function(elem2){
                if (thisObject.nodes[elem2]['modelElement'] != w.target['modelElement']){
                    otherConnectingEntity = thisObject.nodes[elem2];
                }
            });
            if ((blackList.indexOf(w.target.normalisedName) >= 0) || (blackList.indexOf(otherConnectingEntity.normalisedName) >= 0)){
                //this or the other connecting entity is black-listed
                out = false;
            }
            else{
                if ((whiteList.length>0) && ((whiteList.indexOf(w.target.normalisedName)<0) || (whiteList.indexOf(otherConnectingEntity.normalisedName)<0))){
                //they are not white listed and white list is not empty
                    out = false;
                }
            }

        }
        
            
        return out
    }
}
dataForForceBased.prototype.filterBasedOnFusion = function(fuseNodesOn, attributeFusion){
//TO DO rearrange graph to fuse those nodes that have same entities    
    if (!fuseNodesOn){
        //Show nodes and weights as they were from the previous function (filterLinkConfidence and filterBasedOnTextEvidence and filterBasedOnPolarity)
        
        this.reducedNodes2Fusion = this.reducedNodes2WBListed.slice(0);
        this.reducedWeights2Fusion = this.reducedWeights2WBListed.slice(0);
        
        this.alreadyAdded2Fusion = Object.assign({},this.alreadyAdded2WBListed);
        this.alreadyAddedLinkFusion = Object.assign({},this.alreadyAddedLinkWBListed);
        var nodeExist ={}
        //Fix the reducedConnected for those weights not in the model
        this.reducedWeights2Fusion.forEach(function(w){
            if (!nodeExist.hasOwnProperty(w.source.id)){
                w.source.reducedConnected = [];
                nodeExist[w.source.id] = true;
            }
            if (!nodeExist.hasOwnProperty(w.target.id)){
                w.target.reducedConnected = [];
                nodeExist[w.target.id] = true;
            }
            
            //event was present in the model, so entity nodes must be in the model as well
            indexxid = w.source.reducedConnected.indexOf(w.target.id);
            if (indexxid<0){
                w.source.reducedConnected.push(w.target.id);
            }
            
            indexxid = w.target.reducedConnected.indexOf(w.source.id);
            if (indexxid<0){
                w.target.reducedConnected.push(w.source.id);
            }
        });

    }
    else{
        //Mode to fuse together events that share the same attribute
        this.reducedNodes2Fusion = [];
        this.reducedWeights2Fusion = [];
        
        this.alreadyAdded2Fusion = {};
        this.alreadyAddedLinkFusion = {};
        
        var thisObject = this;
        thisObject.attributeExistInGraph = {};
        
        //Fix incorrect reducedConnected from previous models
        var nodeExist ={}
        this.reducedWeights2WBListed.forEach(function(w){
            if (!nodeExist.hasOwnProperty(w.source.id)){
                w.source.reducedConnected = [];
                nodeExist[w.source.id] = true;
            }
            if (!nodeExist.hasOwnProperty(w.target.id)){
                w.target.reducedConnected = [];
                nodeExist[w.target.id] = true;
            }
            
            //event was present in the model, so entity nodes must be in the model as well
            indexxid = w.source.reducedConnected.indexOf(w.target.id);
            if (indexxid<0){
                w.source.reducedConnected.push(w.target.id);
            }
            
            indexxid = w.target.reducedConnected.indexOf(w.source.id);
            if (indexxid<0){
                w.target.reducedConnected.push(w.source.id);
            }
        });

        
        this.reducedWeights2WBListed.forEach(function(weigh){
            //This is assumming that source always points to the event. THIS SHOULD BE CHECKED!
            var w = jQuery.extend({}, weigh);
            
if (w.source.normalisedName=='Phosphorylation') {
    //console.log("1")
}
            if (thisObject.attributeExistInGraph.hasOwnProperty(w.target[attributeFusion])){
                //entity has a duplicate so this node should de dropped 
                //check if the whole entity-event-entity is repeated
                if (thisObject.wholeEventRepeated(w,thisObject.attributeExistInGraph[w.target[attributeFusion]], attributeFusion)){
                    //WE COULD ADD ATTRIBUTES OF THE DUPLICATED TARGET NODES BEFORE FUSION

                    //If we are not adding the attributes, nothing needs to be done but removing the reduced connected from the entity node to the repeated node event
                    indexxid = w.target.reducedConnected.indexOf(w.source.id);
                    if (indexxid>=0){                
                        w.target.reducedConnected.splice(indexxid,1);
                    }
//console.log('Whole attribute duplicated')
                    
                }
                else{
                    //only the entity of this weight is repeated
                
                    
                    //Add weight
                    thisObject.reducedWeights2Fusion.push(w);
                    
                    //Change the connection to the target on the weights object
                    var oldTarget = w.target;
                    //WE COULD ADD ATTRIBUTES OF THE DUPLICATED TARGET NODE BEFORE FUSION
                    w.target = thisObject.attributeExistInGraph[w.target[attributeFusion]];
                                        
                    //Indicate that weight was added
                    thisObject.alreadyAddedLinkFusion[w.source.id+"-"+w.target.id]=w;
                                        
                    //Add node if not added before
                    if (!thisObject.alreadyAdded2Fusion.hasOwnProperty(w.source.id)){
                        thisObject.alreadyAdded2Fusion[w.source.id] = w.source;
                        thisObject.reducedNodes2Fusion.push(w.source);
                    }
                    
                    //Change the connections of the target node on its node
                    indexxid = w.target.reducedConnected.indexOf(w.source.id);
                    if (indexxid<0){                
                        w.target.reducedConnected.push(w.source.id);
                    }
                    //Change the connections of the source node (event) on its node
                    indexxid = w.source.reducedConnected.indexOf(w.target.id);
                    if (indexxid<0){                
                        w.source.reducedConnected.push(w.target.id);
                    }
                    indexxid = w.source.reducedConnected.indexOf(oldTarget.id);
                    if ((indexxid>=0)&&(oldTarget.id!=w.target.id)){                
                        w.source.reducedConnected.splice(indexxid,1);
                    }
                    
                }
            }
            else{
              //entity is not duplicated yet, so add as normal
                
                //Mark that the target node attributeFusion has been added
                thisObject.attributeExistInGraph[w.target[attributeFusion]] = w.target;
                //Add weight
                thisObject.reducedWeights2Fusion.push(w);
                //Indicate that weight was added
                thisObject.alreadyAddedLinkFusion[w.source.id+"-"+w.target.id]=w;
                //Add node if not added before
                if (!thisObject.alreadyAdded2Fusion.hasOwnProperty(w.source.id)){
                    thisObject.alreadyAdded2Fusion[w.source.id] = w.source;
                    thisObject.reducedNodes2Fusion.push(w.source);
                }
                //Add the other node if not added before
                if (!thisObject.alreadyAdded2Fusion.hasOwnProperty(w.target.id)){
                    thisObject.alreadyAdded2Fusion[w.target.id] = w.target;
                    thisObject.reducedNodes2Fusion.push(w.target);
                }
                
                //Add the connections to the source node if they have not been added before
                indexxid = w.source.reducedConnected.indexOf(w.target.id);
                if (indexxid<0){
                    w.source.reducedConnected.push(w.target.id);
                }
                
                //Add the connections to the target node if they have not been added before
                indexxid = w.target.reducedConnected.indexOf(w.source.id);
                if (indexxid<0){
                    w.target.reducedConnected.push(w.source.id);
                }
            }
        
        });
    }
    
    this.reducedNodes2 = this.reducedNodes2Fusion;    
    this.reducedWeights2 = this.reducedWeights2Fusion;
    
    this.alreadyAdded2 = this.alreadyAdded2Fusion;
    this.alreadyAddedLink = this.alreadyAddedLinkFusion;
    
    
}

dataForForceBased.prototype.wholeEventRepeated = function(duplicateWeight, existingEntityNode, attributeFusion){
    //Look all connections of existingNode
    var output = false;
    var thisObject = this;
    existingEntityNode.reducedConnected.forEach(function(elem,idx){ 
        if ((thisObject.nodes[thisObject.mappingIndexName[elem]][attributeFusion] == duplicateWeight.source[attributeFusion])&&(thisObject.nodes[thisObject.mappingIndexName[elem]]["id"] != duplicateWeight.source["id"])){
            //The event name is the same but they have different event ids 
            
            //Find the other entity connected to the existing one
            var otherExistingEntity;
            thisObject.nodes[thisObject.mappingIndexName[elem]].reducedConnected.forEach(function(elem2){
            //thisObject.nodes[thisObject.mappingIndexName[elem]].connected.forEach(function(elem2){
                if (thisObject.nodes[thisObject.mappingIndexName[elem2]][attributeFusion] != existingEntityNode[attributeFusion]){
                //if (thisObject.nodes[elem2][attributeFusion] != existingEntityNode[attributeFusion]){
                    otherExistingEntity = thisObject.nodes[thisObject.mappingIndexName[elem2]];
                    //otherExistingEntity = thisObject.nodes[elem2];
                }
            });
            
            //Find the other entity connected to the duplicate one
            var otherDuplicateEntity;
            duplicateWeight.source.reducedConnected.forEach(function(elem2){
            //duplicateWeight.source.connected.forEach(function(elem2){
                if (thisObject.nodes[thisObject.mappingIndexName[elem2]][attributeFusion] != duplicateWeight.target[attributeFusion]){
                //if (thisObject.nodes[elem2][attributeFusion] != duplicateWeight.target[attributeFusion]){
                    otherDuplicateEntity = thisObject.nodes[thisObject.mappingIndexName[elem2]];
                    //otherDuplicateEntity = thisObject.nodes[elem2];
                }
            });
            if ((otherDuplicateEntity== undefined) && (otherExistingEntity == undefined)){
                //Both events have just one entity so nothing else to compare
                output = true;
            }
            else if ((otherDuplicateEntity== undefined) || (otherExistingEntity == undefined)){
                //One of the events is unary, so they are not the same, and output is still false. It needs to be checked because otherwise next check throws an error
            }
            else{
                if (thisObject.attributeExistInGraph.hasOwnProperty(otherExistingEntity[attributeFusion])){
                    //the other existingentity should be already included
                    if (thisObject.attributeExistInGraph[otherExistingEntity[attributeFusion]].id ==otherExistingEntity.id){
                        //It's not just another one with the same name, but it's actually the same
                        if ((otherExistingEntity[attributeFusion] == otherDuplicateEntity[attributeFusion])){
                            //True if they have the same attribute and we are not looking at the same entity
                            output = true;
                        }
                    }
                }
                //if ((otherExistingEntity[attributeFusion] == otherDuplicateEntity[attributeFusion])&&(!(otherExistingEntity==otherDuplicateEntity))){
            }
        }
    })
    return output;
}


window.dataForForceBased = {
        dataForForceBased: dataForForceBased
    };
})(window)

//=======================w===========================================
