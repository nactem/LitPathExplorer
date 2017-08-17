(function (window, undefined) {

//========================================================================================
//Force-based class  (incomplete) todo: methods for getting attributes
var nodeInfo = function(nodeContainer,neighborContainer,fieldsetId,dataObj,wordTreeObj){    
    //Container for the clicked node
    this.nodeInfoContainer = d3.select(nodeContainer);
    //Container for the neighbor node
    this.neighborInfoContainer = d3.select(neighborContainer);
    //The entire container
    this.fieldsetContainer = d3.select(fieldsetId);
    
    this.dataObj = dataObj;
    this.wordTreeObj = wordTreeObj;
    
    this.confidenceBarWidth = 100;
    this.nodeInfoContainerWidth = 350;
    //Scales
    this.scaleConfidenceIndicatorSize = d3.scale.linear().domain([0,1]).range([1,this.confidenceBarWidth]);
    this.scaleConfidenceIndicatorColor = d3.scale.linear().domain([0,1]).range(["lightblue","blue"]);
    this.scaleConfidenceIndicatorColorNeg = d3.scale.linear().domain([0,1]).range(["tomato","red"]);
    
    //Scales currently duplicated from nodeInfoDisplay. Ideally they should be only there
    this.scaleCitations = d3.scale.linear().domain([0,20]).range([0,1]).clamp(true);
    this.scalePapers = d3.scale.linear().domain([0,10]).range([0,1]).clamp(true);
    this.scaleImpactFactor = d3.scale.linear().domain([0,10]).range([0,1]).clamp(true);
    this.saturateYearOld = 20;
    //this.scaleRecency = d3.scale.linear().domain([Date.parse('1996 01 01'),Date.now()]).range([1,0]).clamp(true);
    var currentDate = new Date(Date.now());
    var saturationDate= new Date(Date.now());
    saturationDate.setFullYear(saturationDate.getFullYear() - this.saturateYearOld);
    this.scaleRecency = d3.scale.linear().domain([Date.parse(saturationDate),Date.parse(currentDate)]).range([1,0]).clamp(true);
    //------------------
    
    //cgi scripts
    this.scriptLoggingURL = GLOBALscriptLoggingURL;
    this.scriptEventOverridenURL = GLOBALscriptEventOverridenURL;
    
    //Sub containers
    this.nodeInfoContainer.append("span").attr("class","clickedNodeTitle");
    this.nodeInfoContainer.append("table").attr("class","tableNodeContainer");
    
    this.neighborInfoContainer.append("span").attr("class","neighborNodesTitle");
    this.neighborInfoContainer.append("table").attr("class","tableNeighborNodesContainer");
    
    this.notRoles = false;//false if we want to visualize the roles in the inspector
    
    
}

nodeInfo.prototype.addNodeInfo = function(node,visObj){
    var thisObject = this;
    this.visObj = visObj;
    this.lastNodeInspected = node;
    
    this.fieldsetContainer.style("visibility","visible");
    

    var xmlImagePath = node.tagName=="Event"?xmlGearPath:xmlMoleculePath;
    
    //Set titles for node info container
    this.nodeInfoContainer
    .select(".clickedNodeTitle")
    .html('Node clicked: '+(node.tagName=="Event"?"Event":"Entity") + (node.inModel?"":" not present in the model")+ '<img src="'+ xmlImagePath + '" width="27px" style="margin-left:10px;">');
    
    //Add datum about the node clicked
    this.addEventTableEntries(this.nodeInfoContainer.select(".tableNodeContainer"),[node]);
    
    
    //Set title for neighbor container
    this.neighborInfoContainer
    .select(".neighborNodesTitle")
    .text((node.tagName=="Event"?"Entities":"Events") +' related:');
        
      
    //Find currently connected neighbor nodes
    var neighArray = []
    node.reducedConnected.forEach(function(connectedId){
        neighArray.push(thisObject.dataObj.nodes[thisObject.dataObj.mappingIndexName[connectedId]]);
        //thisObject.neighborInfoContainer.html(thisObject.neighborInfoContainer.html() + '<span class="neighborInfo">' +neigh.tagName + ': ' + neigh.normalisedName + ' (' + neigh.id + ')' + (neigh.tagName=="Event"? ' - Confidence: '+ neigh.value.toFixed(2):"")+'</span>')
    })
    
    //Add data about the neighbor nodes
    this.addEventTableEntries(this.neighborInfoContainer.select(".tableNeighborNodesContainer"),neighArray);    
    
    /*
    var spanToAdd = this.neighborInfoContainer.selectAll(".neighborInfo").data(neighArray)
    .html(function(neigh){
        return neigh.tagName + (neigh.inModel?"":" not present in the model")+ ': ' + neigh.normalisedName + ' (' + neigh.id + ')' + (neigh.tagName=="Event"? ' - Confidence: '+ neigh.value.toFixed(2)+ ' <span id="confidenceDrillIn" class="glyphicon glyphicon-question-sign"></span>':"");
    });
    
    spanToAdd.enter().append("span")
    .attr("class","neighborInfo")
    .html(function(neigh){
        return neigh.tagName + (neigh.inModel?"":" not present in the model")+': ' + neigh.normalisedName + ' (' + neigh.id + ')' + (neigh.tagName=="Event"? ' - Confidence: '+ neigh.value.toFixed(2) + ' <span id="confidenceDrillIn" class="glyphicon glyphicon-question-sign"></span>':"");
    });
        
    spanToAdd.exit().remove();
    
    */
    
    d3.selectAll("#confidenceDrillIn").on("click", function(){
        event.stopPropagation();
        $("#drillInConfidenceModal").modal('show');
     });
    
    
    //Events when nodes are interacted on the inspector
    this.nodeInfoContainer.select(".nodeInfoContainerText")
    .on("mouseout", function(d,i){
        thisObject.visObj.setClassNode(d,"nodePlain")})
    .on("mouseover", function(d,i){
        thisObject.visObj.setClassNode(d,"nodeHovered")})
    .on("mousedown", function(d,i){
        //thisObject.inspectorTextClicked(d,i);
    });
    
    this.neighborInfoContainer.selectAll(".nodeInfoContainerText")
    .on("mouseout", function(d,i){
        thisObject.visObj.setClassNode(d,"nodePlain")})
    .on("mouseover", function(d,i){
        thisObject.visObj.setClassNode(d,"nodeHovered")})
    .on("mousedown", function(d,i){
        //thisObject.inspectorTextClicked(d,i);
    });
    
    if (tutorialEnabled && (tutorialObj.tutorialStep==6)){
        tutorialObj.provideHint();
    }

}

nodeInfo.prototype.addEventTableEntries = function(selection,data){
    var thisObject = this;
    
    //Determine height based on whether it's the upper part or the bottom one (the bottom one needs more space as it needs to fit the role)
    var upperPart = d3.select(selection[0][0]).attr("class")=="tableNodeContainer"?true:false;
    var svgHeight = (upperPart||thisObject.notRoles)?39:55;
    
    //Update rows
    var trToModify = selection.selectAll("tr").data(data);
    
    
    //trToModify.select(".svg1SecondColumn").call(this.addSvg1SecondColumn,data,this);
    
    //trToModify.select(".svg2SecondColumn").call(this.addSvg2SecondColumn,data,this);
    
    //Create rows
    var trToAdd = trToModify.enter().append("tr").style("vertical-align","top");
    
    
    var svgFirstColumn = trToAdd.append("td").attr("class","td1FirstColumn").append("div").append("svg").attr("class","svgFirstColumn").attr("height",svgHeight).attr("width",thisObject.nodeInfoContainerWidth);//.call(this.addTextFirstColumn,data, this);
    
    //Update SVG of first column (both for inserted or modified rows)
    selection.selectAll("tr").each(function(d,i){
        thisObject.addTextFirstColumn(d3.select(this).select(".td1FirstColumn").selectAll("svg"),[d], thisObject,upperPart);
    });
    
        
    trToAdd.append("td").attr("class","td2FirstColumn").append("div").append("svg").attr("class","svg1SecondColumn").attr("height",45);//.call(this.addSvg1SecondColumn,data,this);

    //Update SVG1 of second column (both for inserted or modified rows)
    selection.selectAll("tr").each(function(d,i){
        thisObject.addSvg1SecondColumn(d3.select(this).select(".td2FirstColumn").selectAll(".svg1SecondColumn"),[d], thisObject);
    });
    
    
    trToAdd.select(".td2FirstColumn").append("div").attr("class","collapse-group collapse in").append("svg").attr("height","150px").attr("class","svg2SecondColumn").style("display","none");//.call(this.addSvg2SecondColumn, this);
    
    //Remove rows
    trToModify.exit().remove();
    
    
    //Make buttons visible on hover only
    selection.selectAll(".svg1SecondColumn")
    .on("mouseout",function(){d3.select(this).select(".breakDownGroup").style("visibility","hidden");})
    .on("mouseover",function(){d3.select(this).select(".breakDownGroup").style("visibility","visible");});

}

nodeInfo.prototype.addTextFirstColumn = function (context, data, thisObject,upperPart,role) {
    var thisObject = thisObject;
    var aa = upperPart;
    if (!context.empty()){
        var newText = context.selectAll(".nodeInfoContainerText").data(data)
                        .html(function(d){
                            return addNodeInfoLocal(d);
                        })
                        .style("cursor",function(d){
                            return decidePointerTypeForEntity(d);                            
                        })
                        .on("click", function(d){
                            linkToOntology(d);
                        });
         
         
                        
         newTextAdded = newText.enter().append("text")
                        .attr("class","nodeInfoContainerText")
                        .attr("x",5)
                        .attr("y",15)
                        .html(function(d){
                            return addNodeInfoLocal(d);
                        })
                        .style("cursor",function(d){
                            return decidePointerTypeForEntity(d);
                        })
                        .on("click", function(d){
                            linkToOntology(d);
                        });
        
        //title always changes
        context.selectAll(".nodeInfoContainerText").append("title")
            .html(function(d,i){
                return d.tagName + '\u000d' + d.normalisedName + ' (' + d.id + ')';
            });

        //Adding ... in case the word does not fit
        context.select(".nodeInfoContainerTspan")
        .text(function(dd,ii){
            while (d3.select(this).node().getComputedTextLength()>(thisObject.nodeInfoContainerWidth - 10)){
                d3.select(this).text(d3.select(this).text().slice(0,-4)+'...');
            }
            return d3.select(this).text();
        });
    }
    function decidePointerTypeForEntity(d){
        if ((d.tagName!='Event')&&(d.id.match(regExChEBI) || d.id.match(regExUniProt) || d.id.match(regExPanther) || d.id.match(regExMESH) || d.id.match(regExNCBI)) ){
            return "pointer";
        }
            
        else{
            return "default";
        }
    }
                            
    function linkToOntology(d){
        if (!(d.tagName=='Event')){
                                
            if (d.id.match(regExChEBI)){
                extractedId = d.id.match(regExChEBI)[1];
                window.open('http://www.ebi.ac.uk/chebi/searchId.do?chebiId=CHEBI:' + extractedId);
                //window.open('https://www.ebi.ac.uk/chebi/searchId.do;jsessionid=710A16CB200EB26872013CA4990BCC38?chebiId=CHEBI' + extractedId);
            }
            else if (d.id.match(regExUniProt)){
                extractedId = d.id.match(regExUniProt)[1];
                window.open('http://www.uniprot.org/uniprot/' + extractedId);
            }
            else if (d.id.match(regExPanther)){
                extractedId = d.id.match(regExPanther)[1];
                window.open('http://www.pantherdb.org/pathway/pathCatDetail.do?clsAccession=' + extractedId);
            }
            else if (d.id.match(regExMESH)){
                extractedId = d.id.match(regExMESH)[1];
                window.open('https://meshb.nlm.nih.gov/#/record/ui?ui=' + extractedId);
            }
            else if (d.id.match(regExCAS)){
                extractedId = d.id.match(regExCAS)[1];
                //window.open('http://commonchemistry.org/ChemicalDetail.aspx?ref=' + extractedId);
            }
            else if (d.id.match(regExNCBI)){
                extractedId = d.id.match(regExNCBI)[1];
                window.open('https://www.ncbi.nlm.nih.gov/gene?cmd=Retrieve&dopt=full_report&list_uids=2101' + extractedId);
            }
        }
    }
    function addNodeInfoLocal(d){
        var tempString = '';
        var localRole = '';
        if (!(d.tagName=="Event")){
            tempString = '<tspan x="0" dy="0">' + d.tagName + ':</tspan>'
        }
        tempString = tempString + '<tspan class = "nodeInfoContainerTspan" x="0" dy="1.2em">' + d.normalisedName + ' (' + d.id + ')</tspan>';//dy could be set 0.6
        if (!upperPart){
            if (d.tagName!='Event'){
                if (dataFBL.alreadyAddedLink.hasOwnProperty(thisObject.lastNodeInspected.id + '-' + d.id)){
                    localRole = dataFBL.alreadyAddedLink[thisObject.lastNodeInspected.id + '-' + d.id].role;
                }
            }
            else{
                if (dataFBL.alreadyAddedLink.hasOwnProperty(d.id + '-' +thisObject.lastNodeInspected.id)){
                    localRole = dataFBL.alreadyAddedLink[d.id + '-' +thisObject.lastNodeInspected.id].role;
                }
            }
            tempString = tempString + '<tspan class = "nodeRoleContainerTspan" x="50px" dy="1.2em">Role: ' + localRole + '</tspan>';
        }
        return tempString;
    }
}

nodeInfo.prototype.addSvg1SecondColumn =function (context, data, thisObject) {
    var dataForIcons, contextSvg2;
    if (!context.empty()){
        if (data[0].tagName!="Event"){
            valueToSend = undefined;
            dataForIcons = [];
        }
        else{
            valueToSend = data[0].value.toFixed(2);
            dataForIcons = data;
        }
        //Add main confidence bar
        thisObject.addConfidenceInfo(context, 'Confidence: ', valueToSend);
        
        
        //Add icons to breakdown, view or edit confidence
        var addChevron = context.selectAll(".breakDownGroup").data(dataForIcons);
        
        addChevron.select(".inspectTextButton")
        .on("mousedown",function(d,i){
            thisObject.inspectorTextClicked(d,i);
        });
        
        var iconsGroup = addChevron.enter().append("g").attr("class","breakDownGroup").style("visibility","hidden");
        
        iconsGroup.append("image").attr("class","breakDownButton")
        .attr("width",15)
        .attr("height",15)
        .attr("x",220)
        .attr("y",10)
        .attr("xlink:href",chevronDownImage)
        .attr("cursor","pointer")           
        .on("mousedown",function(d,i){
            thisObject.chevronClicked(d3.select(this.parentElement.parentElement.parentElement.parentElement).select(".svg2SecondColumn"),thisObject,d3.select(this.parentElement.parentElement));
        });
        
        iconsGroup.selectAll(".breakDownButton")
        .append("title").text("Show breakdown to understand how this confidence is computed.");
        
        iconsGroup.append("image").attr("class","inspectTextButton")
        .attr("width",15)
        .attr("height",15)
        .attr("x",250)
        .attr("y",10)
        .attr("xlink:href",inspectTextImage)
        .attr("cursor","pointer")        
        .on("mousedown",function(d,i){
            thisObject.inspectorTextClicked(d,i);
        });
        
        iconsGroup.selectAll(".inspectTextButton")
        .append("title").text("Analyze related evidence found in the literature.");
        
        iconsGroup.append("image").attr("class","modifyEventButton")
        .attr("width",15)
        .attr("height",15)
        .attr("x",280)
        .attr("y",10)
        .attr("xlink:href",modifyEventImage)
        .attr("cursor","pointer")                
        .on("mousedown",function(d,i){
            thisObject.modifyOverallEventConfidenceIconClicked(d3.select(this.parentElement.parentElement.parentElement.parentElement).select(".svg2SecondColumn"),thisObject,d3.select(this.parentElement.parentElement));
        });
        
        iconsGroup.selectAll(".modifyEventButton")
        .append("title").text("Override the overall event confidence with a user-defined value.");
        
        addChevron.exit().remove();
        
        if (!addChevron.exit().empty()){
            //Break-down should disappear because there is now an entity
            d3.select(context.node().parentElement.parentElement).select(".svg2SecondColumn").style("display","none");
            
        }
        else{
            //There is an event
            if ((!context.select(".breakDownButton").empty())&&(context.select(".breakDownButton").attr("href") != chevronDownImage)){
                //There was an event from the previous interaction and the breakdown was expanded, so update the data (so that it is also expanded)                
                
               //Show breakdown
               contextSvg2 = d3.select(context.node().parentElement.parentElement).select(".svg2SecondColumn")
               thisObject.addSvg2SecondColumn(contextSvg2,contextSvg2.data(), thisObject);
                //thisObject.toggleClickedNode(d3.select(context.node().parentElement.parentElement).select(".svg2SecondColumn"));
            }
            
        }
    }
}

nodeInfo.prototype.modifyOverallEventConfidenceIconClicked = function(contextSvg2,thisObj,context){
    var localNode = contextSvg2.data()[0];
    var thisObject = thisObj;
    
    var localNodeOpenValue = localNode.value;
    var localNodeOpenPolarity = localNode.polarity;
    var localNodeOpenConfidenceEnabled = localNode.confidenceEnabled;
    
    //set components to disable/enable depending if the confidence was overriden
    if (localNode.confidenceEnabled){
        $("#confidenceChangeReason").prop("disabled",true);
        $("#btnUndoConfidence").prop("disabled",true);        
    }
    else{
        $("#confidenceChangeReason").prop("disabled",false);
        $("#btnUndoConfidence").prop("disabled",false);
    }
    $("#confidenceChangeReason").val("");
    
    //Show modal
    $("#changeOverallEventConfidenceModal").modal('show');
    
    //move slider to the current position
    $("#inputRangeOverallEventConfidence").val(parseFloat((localNode.value*localNode.polarity).toFixed(2)));
    
    //update labels to the current values
    d3.select("#spanAdjustOverallEventConfidence")
    .text(Math.abs(localNode.value).toFixed(2));
    
    d3.select("#spanAdjustOverallEventPolarity")
    .attr("class",localNode.polarity>=0?"positiveSentenceClass":"negativeSentenceClass")
    .text(localNode.polarity>=0?"Positive event":"Negative event");
    
    //listener slider
    d3.select("#inputRangeOverallEventConfidence")
    .on("input",function(d,i){
        //triggered as the slider is moved
        
        //get new values
        localNode.value = parseFloat(this.value);
        localNode.polarity = (parseFloat(this.value)>=0)?1:-1;        
        localNode.confidenceEnabled = false;        
        
        //update labels to the current values
        d3.select("#spanAdjustOverallEventConfidence")
        .text(Math.abs(localNode.value).toFixed(2));
        
        d3.select("#spanAdjustOverallEventPolarity")
        .attr("class",localNode.polarity>=0?"positiveSentenceClass":"negativeSentenceClass")
        .text(localNode.polarity>=0?"Positive event":"Negative event");
        
        //enable undo and textarea
        $("#confidenceChangeReason").prop("disabled",false);
        $("#btnUndoConfidence").prop("disabled",false);
        
        //update graph and inspector
        abruptConfidenceChange(localNode)        
    })
    .on("change", function(d,i){
        //triggered after the slider is used
        //retrain network OLD it is better to do it when the Save button is pressed
        
    });
    
    //listener undo
    d3.select("#btnUndoConfidence")
    .on("click",function(d,i){      
        
        //compute confidence from feature values
        var computedConfidence = eventAgg.computeAggregatedValue(localNode,eventAgg.SIMPLE_AVERAGE);;
        
        //get new values
        localNode.value = computedConfidence;
        localNode.polarity = computedConfidence>=0?1:-1;        
        localNode.confidenceEnabled = true;
        
        //move slider to the current position
        $("#inputRangeOverallEventConfidence").val(parseFloat((localNode.value).toFixed(2)));        
        
        //update labels to the current values
        d3.select("#spanAdjustOverallEventConfidence")
        .text(Math.abs(localNode.value).toFixed(2));
        
        d3.select("#spanAdjustOverallEventPolarity")
        .attr("class",localNode.polarity>=0?"positiveSentenceClass":"negativeSentenceClass")
        .text(localNode.polarity>=0?"Positive event":"Negative event");
        
        //disable undo and textarea
        $("#confidenceChangeReason").prop("disabled",true);
        $("#confidenceChangeReason").val("")        
        
        $("#btnUndoConfidence").prop("disabled",true);
        
        //update graph and inspector
        abruptConfidenceChange(localNode)
    });
    
    //listener close? same as undo without changing the dialog values
    d3.select("#btnCloseOverallConfidences")
    .on("click",function(d,i){      
        
        //get default values
        localNode.value =  localNodeOpenValue;
        localNode.polarity = localNodeOpenPolarity;
        localNode.confidenceEnabled = localNodeOpenConfidenceEnabled;
        
        //update graph and inspector
        abruptConfidenceChange(localNode)
    });
    
    //listener save button
    d3.select("#btnSaveOverallConfidences")
    .on("click",function(d,i){
        if (!($("#confidenceChangeReason").prop("disabled"))){
            //Logging changes and reasons when saved
            dataToSend={'userId': userId, 'session':sessionId, 'operation':'overrideEventConfidence','node':localNode.modelElement, 'attributes':$("#confidenceChangeReason").val(), 'oldValue':localNodeOpenValue,'newValue': localNode.value};
            
            jQuerySendData(dataToSend,thisObject.scriptLoggingURL);
        }
        //retrain network: it is arguable if this condition should exist or not, as we may want to train anyway. Now it only trains if the checkbox is ticked
        if (dataFBL.NNmode){
            
            var unlabeledEventNodes = [];
            var labeledEventNodes = [];
            nLabeledEvents = 0;
            dataFBL.nodes.forEach(function(elem){
                if ((elem.tagName == 'Event')){
                    if ((elem.confidenceEnabled)){
                        unlabeledEventNodes.push(elem);
                    }
                    else{
                        labeledEventNodes.push(elem);
                        nLabeledEvents = nLabeledEvents + 1;
                    }
                }
            })
            var orderedEventNodes = unlabeledEventNodes.concat(labeledEventNodes);
            eventAgg.retrainNN(orderedEventNodes,nLabeledEvents);            
            //set message NN weights are under recomputation
            d3.select("#networkRegenerated").style("visibility","visible");
        }
        
        //save changes persistently
        dataToSend={'userId': userId, 'session':sessionId, 'nodeId':localNode.id, 'nodeValue': localNode.value, 'nodePolarity': localNode.polarity};
            
        jQueryAJAX(dataToSend,thisObject.scriptEventOverridenURL,confirmedOverride);
        
        function confirmedOverride(respose){
            //nop
        }
    });
    
    function abruptConfidenceChange(localNode){
        var indexWeight1 = localNode.connectedLinkIndex[0];
        var indexWeight2 = localNode.connectedLinkIndex[1];
        
        dataFBL.weights[indexWeight1].value = localNode.value;
        dataFBL.weights[indexWeight2].value = localNode.value;
        
        //Update graph (some events may have changed polarity)
        visualizeGraphAfterPolarityFiltering();
        
        //Update node inspector
        thisObject.addNodeInfo(localNode, thisObject.visObj);
        
    }
    
    function jQuerySendData(dataToSend,urlString){
            $.ajax({
                url: urlString,
                data: JSON.stringify(dataToSend),
                type: 'POST',
                contentType: "application/json; charset=utf-8",
                success: responseFromServer,
                error: function(request,error){
                    alert("Request: " + JSON.stringify(request) + "eror :" + error);
                }
            });
        }
        function responseFromServer(data){
            
        }
}

nodeInfo.prototype.chevronClicked = function(contextSvg2,thisObject,context){
    
    
    if (context.select(".breakDownButton").attr("href")==chevronDownImage){
        //Make SVG visible
        contextSvg2.style("display","inline");
        
        //Change image
        context.select(".breakDownButton")
        .attr("xlink:href",chevronUpImage);
        
        //Show breakdown
        thisObject.addSvg2SecondColumn(contextSvg2,contextSvg2.data(), thisObject);
        
        //This is to distinguish from the first time it is used
        if (!$(contextSvg2.node().parentElement).hasClass("in")){
            //Expand div
            thisObject.toggleClickedNode(contextSvg2);
        }
    }
    else{
        context.select(".breakDownButton")
        .attr("xlink:href",chevronDownImage);
        
        //Collapse div
        thisObject.toggleClickedNode(contextSvg2);
    }
    
}

nodeInfo.prototype.addSvg2SecondColumn =function (context, data, thisObject) {
    //context is SVG2 selection
    var dataToShow;
    if (!context.empty()){
        if (data[0].tagName!="Event"){
            dataToShow = [];
        }
        else{
            dataToShow = [
            { "name":"Polarity", "value": data[0].polarity, "showValue": data[0].polarity.toFixed(2)}, 
            { "name":"Lang. cert.", "value": data[0].languageCertainty, "showValue": data[0].languageCertainty.toFixed(2)}, 
            { "name":"# papers", "value": thisObject.scalePapers(data[0].nPapers), "showValue": data[0].nPapers}, 
            { "name":"# cites", "value": thisObject.scaleCitations(data[0].nCitations), "showValue": data[0].nCitations}, 
            { "name":"Altmetrics", "value": data[0].altmetricPct/100, "showValue": data[0].altmetricPct.toFixed(2)}, 
            { "name":"IF", "value": thisObject.scaleImpactFactor(data[0].impactFactor), "showValue": data[0].impactFactor.toFixed(2)}, 
            { "name": "Date", "value": thisObject.scaleRecency(data[0].recency), "showValue": (new Date(data[0].recency)).toDateString().slice(4)}];
        }
        context.attr("data-placement","top")
        .attr("data-trigger","hover")
        .attr("data-toggle","popover");
        
        thisObject.showBreakDown(context, dataToShow, thisObject,data[0].confidenceEnabled);        
    }
}

nodeInfo.prototype.showBreakDown = function (initialSelection, confidenceBreakDown, thisObject,eventEnabled){
    var topOfOutline = 12;
    var thisObject = this;
    
    if (tutorialEnabled && (tutorialObj.tutorialStep==7)){
        tutorialObj.provideHint();
    }
    
    //Updates --------------------------------------------
    var selectionModify =  initialSelection.selectAll(".individualBreakDown").data(confidenceBreakDown);
    
    var eventIsEnabled = eventEnabled;
    
    if (eventIsEnabled){
        $(initialSelection).popover('destroy');
    }
    else{
        $(initialSelection).popover({"title":"Event confidence overriden","content":"These values are not used for the calculation of the confidence as the overall event confidence was modified. Undo adjustment to revert this change."});
    }
    
    /*
    //Modify label above breakdown bar level
    selectionModify.selectAll(".labelAboveBreakDown")
    .attr("x", 1)
    .attr("y", topOfOutline - 1)    
    .text(function(d){return d.name + ": " + d.value;});
    */
    
    //Modify label at breakdown bar level
    selectionModify.select(".labelAtBreakDown")
    .attr("x", function(d,i){
        if (d.value >= 0){
            return thisObject.scaleConfidenceIndicatorSize.range()[1] - 5;
        }
        else{
            return thisObject.scaleConfidenceIndicatorSize.range()[1] + 5;
        }
    })
    .style("text-anchor", function(d,i){
        if (d.value>=0){
            return "end";
        }
        else{
            return "start";
        }
    })
    .text(function(d){return d.name + ": " + d.showValue;});
        
    //Modify the indicator 
    selectionModify.select(".confidenceBreakDownBar")
    .attr("x", thisObject.scaleConfidenceIndicatorSize.range()[1]);
    //.attr("width", 1);
        
    //Inserts-----------------------------------------------
    var addedGroups = selectionModify.enter().append("g")
    .attr("class", "individualBreakDown")
    .attr("transform",function(d,i){
            var tx = 5;
            var ty = 20* i;
            return "translate(" + tx + "," + ty + ")"
    });
        
    /*
    //Add label above bar
    addedGroups.append("text")
	.attr("class","labelAboveBreakDown")
    .attr("x", 1)
    .attr("y", topOfOutline - 1)
    .style("fill","green")
    .style("font-size","11px")    
    .text(function(d){return d.name + ": " + d.value;});
    */
    
    //Add label at the same level of bar
    addedGroups.append("text")
	.attr("class","labelAtBreakDown")
    .attr("x", function(d,i){
        if (d.value>=0){
            return thisObject.scaleConfidenceIndicatorSize.range()[1] - 5;
        }
        else{
            return thisObject.scaleConfidenceIndicatorSize.range()[1] + 5;
        }
    })
    .style("text-anchor", function(d,i){
        if (d.value>=0){
            return "end";
        }
        else{
            return "start";
        }
    })
    .attr("y", 20)
    .style("fill","green")
    .style("font-size","11px")    
    .text(function(d){return d.name + ": " + d.showValue;});
        
    //Add the borders of indicators 
    addedGroups.append("line")
    .attr("class","indicatorBorderBreakDown1")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", 0)
    .attr("y2", 20)        
    .style("stroke","black")
    .style("stroke-width",0.5)
    .style("stroke-dasharray","2 2");
    
    addedGroups.append("line")
    .attr("class","indicatorBorderBreakDown2")
    .attr("x1", thisObject.scaleConfidenceIndicatorSize.range()[1]*2)
    .attr("y1", 0)
    .attr("x2", thisObject.scaleConfidenceIndicatorSize.range()[1]*2)
    .attr("y2", 20)        
    .style("stroke","black")
    .style("stroke-width",0.5)
    .style("stroke-dasharray","2 2");
	    
    //Add the indicator 
    addedGroups.append("rect")
    .attr("class","confidenceBreakDownBar")
    .attr("x", thisObject.scaleConfidenceIndicatorSize.range()[1])
    .attr("y", topOfOutline)
    .style("fill","white")
    .attr("height", 8)
    .attr("width", 1)
    .style("stroke","black")
    .style("stroke-width",0.5);
    
    //add descriptive title
    addedGroups.append("title")
    .text(function(d,i){
        return insertTitleForBreakdown(d);
    });
    
        
    //Add the transitions of frequency strength
    initialSelection.selectAll(".confidenceBreakDownBar")
    .transition()
    .delay(500)
    .duration(750)
    .style("fill",function(d,i){
        if (eventIsEnabled){
            if (d.value>=0){
                return thisObject.scaleConfidenceIndicatorColor(d.value);
            }
            else{
                return thisObject.scaleConfidenceIndicatorColorNeg(0-d.value);
            }
        }
        else{
            return "lightgray"
        }
        
    })    
    .attr("x", function(d,i){
        if (d.value>=0){
            return thisObject.scaleConfidenceIndicatorSize.range()[1];
        }
        else{
            return thisObject.scaleConfidenceIndicatorSize.range()[1] - thisObject.scaleConfidenceIndicatorSize(d.value *(-1));
        }
    })
    .attr("width", function(d,i){
        return thisObject.scaleConfidenceIndicatorSize(Math.abs(d.value));
    });
    
    //Removals ----------------------------------
    selectionModify.exit().remove();
    //-------------
    
    function insertTitleForBreakdown(d){
        if (d.name=="Polarity"){
            return "Event polarity: " + d.showValue + "\u000AA negative polarity value indicates the certainty of this event not happening.";
        }
        else if(d.name=="Lang. cert."){
            return "Language certainty: " + d.showValue + "\u000AThis incorporates the certainty in the language used in the papers that mention this event.";
        }
        else if(d.name=="# papers"){
            return "Number of papers: " + d.showValue + "(" + (d.value*100).toFixed(0) + "%)\u000AThis indicates the total number of papers mentioning this event. This value saturates to its maximum with " + thisObject.scalePapers.domain()[1]+ " papers or more.";
        }
        else if(d.name=="# cites"){
            return "Number of citations: " + d.showValue + "(" + (d.value*100).toFixed(0) + "%)\u000AThis indicates the total number of citations that papers mentioning this event have received. This value saturates to its maximum with " + thisObject.scaleCitations.domain()[1] + " cites or more.";
        }
        else if(d.name=="Altmetrics"){
            return "Altmetrics: " + d.showValue + "(" + (d.value*100).toFixed(0) + "%)\u000APopularity score on the Web based on Altmetric. The value on the bar shows the percentile compared to all publications.";
        }
        else if(d.name=="IF"){
            return "Impact factor: " + d.showValue + "\u000AThis value indicates the average journal impact factors for 2014 for the papers mentioning this event. This value saturates to its maximum with an impact factor of " + thisObject.scaleImpactFactor.domain()[1] + " or higher.";
        }
        else if(d.name=="Date"){
            return "Date (not used for confidence computation): " + d.showValue + "(" + (d.value*100).toFixed(0) + "%)\u000ADenotes the average publication date of the papers mentioning this event. The older the average date, the more established the event notion is. This value saturates to its maximum with " + thisObject.saturateYearOld+ " year-old paper or older.";
        }
        else{
            return "No description found";
        }
    }
}

nodeInfo.prototype.toggleClickedNode = function(context){
    $(context.node().parentElement).collapse('toggle');
    
    /*
    d3.select("#advancedSearchExpansionButton").select("span")
    .attr("class",function(){
        return d3.select("#advancedSearchExpansionButton").select("span").attr("class") == 'glyphicon glyphicon-chevron-down'?'glyphicon glyphicon-chevron-up':'glyphicon glyphicon-chevron-down';
    })*/
}


nodeInfo.prototype.addConfidenceInfo = function(initialSelection, textAbove, value){
        //This is used to draw the bar showing the event confidence in the inspector
    
        var topOfOutline = 15;
        var thisObject = this;
        
        //Updates ----------------------------------------------
        var selectionModify = initialSelection.selectAll(".confidenceGroup").data(value==undefined?[]:[value]);
        
        //Change label above bar
        selectionModify.select(".labelAbove")
        .text(textAbove + " " + value);
        
        //Inserts ----------------------------------------------
        //set the selection where elements are added for the first time
        var selection = selectionModify.enter().append("g").attr("class","confidenceGroup");        
                
        //Add label above bar
        selection.append("text")
		.attr("class","labelAbove")
        .attr("x", 5)
	    .attr("y", topOfOutline - 2)
        .style("fill","green")
        .style("font-size","11px")
        //.style("stroke","black")
        //.style("stroke-width",0.5)
	    //.attr("height", 8)
	    .text(textAbove + " " + value);
        
        //Add the borders of indicators 
        /*
        selection.append("rect")
		.attr("class","neighborFreqRectBorder")
        .attr("x", 5)
	    .attr("y", topOfOutline)
        .style("fill","none")
        .style("stroke","black")
        .style("stroke-width",0.5)
	    .attr("height", 8)
	    .attr("width", this.scaleConfidenceIndicatorSize.range()[1]*2);
        */
        
        selection.append("line")
		.attr("class","leftLine")
        .attr("x1", 5)
	    .attr("y1", topOfOutline+3)
        .attr("x2", 5)
	    .attr("y2", topOfOutline+8)
        .style("fill","none")
        .style("stroke","black")
        .style("stroke-width",0.5);
	    
        
        selection.append("line")
		.attr("class","bottomLine")
        .attr("x1", 5)
	    .attr("y1", topOfOutline+8)
        .attr("x2", 5 + this.scaleConfidenceIndicatorSize.range()[1]*2)
	    .attr("y2", topOfOutline+8)
        .style("fill","none")
        .style("stroke","black")
        .style("stroke-width",0.5)
	    .attr("height", 8)
	    .attr("width", this.scaleConfidenceIndicatorSize.range()[1]*2);
        
        selection.append("line")
		.attr("class","rightLine")
        .attr("x1", 5 + this.scaleConfidenceIndicatorSize.range()[1]*2)
	    .attr("y1", topOfOutline+3)
        .attr("x2", 5+ this.scaleConfidenceIndicatorSize.range()[1]*2)
	    .attr("y2", topOfOutline+8)
        .style("fill","none")
        .style("stroke","black")
        .style("stroke-width",0.5);
        
        selection.append("line")
		.attr("class","middleLine")
        .attr("x1", 5 + this.scaleConfidenceIndicatorSize.range()[1])
	    .attr("y1", topOfOutline+5)
        .attr("x2", 5+ this.scaleConfidenceIndicatorSize.range()[1])
	    .attr("y2", topOfOutline+8)
        .style("fill","none")
        .style("stroke","black")
        .style("stroke-width",0.5);
        
        
        //Add the indicators 
        selection.append("rect")
		.attr("class","neighborFreqRect")
        .attr("x", 5 + this.scaleConfidenceIndicatorSize.range()[1])
	    .attr("y", topOfOutline)
        .style("fill","white")
	    .attr("height", 8)
	    .attr("width", 1)
        .style("stroke","black")
        .style("stroke-width",0.5);
        
        //Add the numbers for reference
        selection.append("text")
		.attr("class","refLabelNeg")
        .attr("x", 5)
	    .attr("y", topOfOutline + 21)
        .style("fill","green")
        .style("font-size","11px")
	    .text("-1");
        
        selection.append("text")
		.attr("class","refLabel0")
        .attr("x", 5 + this.scaleConfidenceIndicatorSize.range()[1])
	    .attr("y", topOfOutline + 21)
        .style("fill","green")
        .style("font-size","11px")
        .style("text-anchor", "middle")
	    .text("0");
        
        selection.append("text")
		.attr("class","refLabelPos")
        .attr("x", 5 + this.scaleConfidenceIndicatorSize.range()[1]*2)
	    .attr("y", topOfOutline + 21)
        .style("fill","green")
        .style("font-size","11px")
        .style("text-anchor", "end")
	    .text("1");
        
        //Add the transitions of frequency strength
        selectionModify.select(".neighborFreqRect")
        .transition()
        .delay(500)
        .duration(1000)
        .style("fill",function(d,i){
            if (d>0){
                return thisObject.scaleConfidenceIndicatorColor(d);
            }
            else{
                return thisObject.scaleConfidenceIndicatorColorNeg(0-d);
            }
        })
        //.style("fill-opacity", function(d,i){
        //    return d.value / thisObject.frequencyRange[1];
        //})
        .attr("x", function(d,i){
            if (d>0){
                return 5 + thisObject.scaleConfidenceIndicatorSize.range()[1];
            }
            else{
                return 5 + thisObject.scaleConfidenceIndicatorSize.range()[1] - thisObject.scaleConfidenceIndicatorSize(d*(-1));
            }
        })
        .attr("width", function(d,i){
            return thisObject.scaleConfidenceIndicatorSize(Math.abs(d));
        });
        
        //Removals
        selectionModify.exit().remove();
        
}

nodeInfo.prototype.addNodeInfo_old = function(node,visObj){
    var thisObject = this;
    this.visObj = visObj;
    this.lastNodeInspected = node;
    
    this.fieldsetContainer.style("visibility","visible");
    
    this.nodeInfoContainer.data([node])
    .html('<span class="clickedNodeTitle">Node clicked:</span><br> ' + node.tagName + (node.inModel?"":" not present in the model")+ ": " + node.normalisedName + " (" + node.id + ")" + (node.tagName=="Event"? ' - Confidence: '+ node.value.toFixed(2)+ ' <span id="confidenceDrillIn" class="glyphicon glyphicon-question-sign"></span>':""));    
    
    if (node.tagName=="Event"){
        this.neighborInfoContainer.html('<span class="neighborInfoTitle">Entities related :</span>');
    }
    else{
        this.neighborInfoContainer.html('<span class="neighborInfoTitle">Events related:</span>');
    }
    
    var neighArray = []
    node.reducedConnected.forEach(function(connectedId){
        neighArray.push(thisObject.dataObj.nodes[thisObject.dataObj.mappingIndexName[connectedId]]);
        //thisObject.neighborInfoContainer.html(thisObject.neighborInfoContainer.html() + '<span class="neighborInfo">' +neigh.tagName + ': ' + neigh.normalisedName + ' (' + neigh.id + ')' + (neigh.tagName=="Event"? ' - Confidence: '+ neigh.value.toFixed(2):"")+'</span>')
    })
    
    var spanToAdd = this.neighborInfoContainer.selectAll(".neighborInfo").data(neighArray)
    .html(function(neigh){
        return neigh.tagName + (neigh.inModel?"":" not present in the model")+ ': ' + neigh.normalisedName + ' (' + neigh.id + ')' + (neigh.tagName=="Event"? ' - Confidence: '+ neigh.value.toFixed(2)+ ' <span id="confidenceDrillIn" class="glyphicon glyphicon-question-sign"></span>':"");
    });
    
    spanToAdd.enter().append("span")
    .attr("class","neighborInfo")
    .html(function(neigh){
        return neigh.tagName + (neigh.inModel?"":" not present in the model")+': ' + neigh.normalisedName + ' (' + neigh.id + ')' + (neigh.tagName=="Event"? ' - Confidence: '+ neigh.value.toFixed(2) + ' <span id="confidenceDrillIn" class="glyphicon glyphicon-question-sign"></span>':"");
    });
    
    
    spanToAdd.exit().remove();
    
    d3.selectAll("#confidenceDrillIn").on("click", function(){
        event.stopPropagation();
        $("#drillInConfidenceModal").modal('show');
     });
    
    
    //Events when nodes are interacted on the inspector
    this.nodeInfoContainer
    .on("mouseout", function(d,i){
        thisObject.visObj.setClassNode(d,"nodePlain")})
    .on("mouseover", function(d,i){
        thisObject.visObj.setClassNode(d,"nodeHovered")})
    .on("mousedown", function(d,i){
        thisObject.inspectorTextClicked(d,i);
    });
    
    this.neighborInfoContainer.selectAll(".neighborInfo")
    .on("mouseout", function(d,i){
        thisObject.visObj.setClassNode(d,"nodePlain")})
    .on("mouseover", function(d,i){
        thisObject.visObj.setClassNode(d,"nodeHovered")})
    .on("mousedown", function(d,i){
        thisObject.inspectorTextClicked(d,i);
    });
    
}

nodeInfo.prototype.inspectorTextClicked = function(d,i){
    if (d.tagName=='Event'){
        //make text analyzer fieldset visible
        this.wordTreeObj.wordTreeFieldset.style("visibility","visible");
        
        //set word in input box
        //d3.select("#searchWordTree")[0][0].value = 'survivin';
        
        //set words to be highlighted when tree is ready
        //this.wordTreeObj.setToHighlightWords(['stat3'],['expression','binding','regulate','regulates']);
        this.wordTreeObj.setToHighlightWords(d.modelElement);
        
        //Make plain sentence tab visible
        showPlainSentenceTab(d.modelElement)
        
        //start plainSentences
        //this.wordTreeObj.showIndividualSentences(d.modelElement);
        
        this.nodeClicked = d;//I am afraid that this assignment is not correct if we want to keep here the clicked node in the network
        //this.nodeClickedForTextInspection = d;
        
        //start word tree with word
        //this.wordTreeObj.addWordTree("survivin",'suffix');
        
        scrollScreenVertically(d3.select("#textAnalyzerFieldset").node().getBoundingClientRect().top);    
        
        if (tutorialEnabled && (tutorialObj.tutorialStep==8)){
            tutorialObj.provideHint();
        }
    }    
}
window.nodeInfoDisplay = {
        nodeInfo: nodeInfo
    };
})(window)
