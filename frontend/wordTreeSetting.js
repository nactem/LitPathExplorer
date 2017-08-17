(function (window, undefined) {

//========================================================================================

var wordTree = function(wordTreeId,wordTreeFieldsetId, textualEvidence, dataFBLObj, PMCIDtoPMID, articleMetaData){
    /* Constructor
    wordTreeId: container where the wordtree is drawn
    wordTreeFieldsetId: apparently not used anymore
    textualEvidence: file with the textualEvidence 
    */
    
    this.wordTreeContainer = d3.select(wordTreeId);
    this.wordTreeFieldset = d3.select(wordTreeFieldsetId);
    this.textualEvidence =  textualEvidence;
    
    this.scriptSuffixTreeURL = GLOBALscriptSuffixTreeURL;
    this.scriptLemmatizerURL = GLOBALscriptLemmatizerURL;
    //thisObject = this;
    
    //start with a fixed example this should example
    this.setData();
    google.charts.load('current', {packages:['wordtree']});
    //google.charts.setOnLoadCallback(thisObject.addWordTree);
    
    this.addListenersForWordTree();
    this.dataFBL = dataFBLObj;
    this.modifiedEvents = {};
    
    this.PMCIDtoPMID = PMCIDtoPMID;
    this.articleMetaData = articleMetaData;
    
    //This array should contain all the useful meta-data information associated to the sentences. Since it was added a posteriori it may not be used by all methods
    this.arrayOfSentenceObjects = []; 
    
}

wordTree.prototype.addListenersForWordTree = function(){    
    var thisObject = this;
    
    //New sentence confidence from the tree have been set
    d3.select("#btnSaveConfidences")
    .on("click",function(dd,ii){
        d3.select("#changeConfidenceModal").selectAll(".modal-body").selectAll(".sentenceText").each(function(d,i){
            thisObject.listOfConfidence[d] = parseFloat(d3.select(this).selectAll("input")[0][0].value);
            
            var output = getPaperSentenceIndexFromRawIndex(d,thisObject.arrayOfPaperObjects);
            var paperIndex = output.paperIndex;
            var sentenceIndex = output.sentenceIndex;
            
            sentenceSlider = d3.select(d3.selectAll(".plainPapers")[0][paperIndex]).select("#inputRangeConfidencePlainSentence"+sentenceIndex);
            sentenceSlider.node().value = thisObject.listOfConfidence[d];
            thisObject.inputIndividualSentenceModified(thisObject.arrayOfPaperObjects[paperIndex],sentenceIndex,sentenceSlider.node());
        });
        
        //Update addWordTree, sentences and trigger viz
        var focusedWord = dataFBL.evidence[nodeInfo.nodeClicked.modelElement].meta.enriched_evidence.evidence[0].evidence_text.slice(dataFBL.evidence[nodeInfo.nodeClicked.modelElement].meta.enriched_evidence.enriched_participant_a[0].begin,dataFBL.evidence[nodeInfo.nodeClicked.modelElement].meta.enriched_evidence.enriched_participant_a[0].end); //Get the word with the proper casing
        
        thisObject.addWordTree(thisObject.currentWord==undefined?focusedWord:thisObject.currentWord,thisObject.typeTree, thisObject.currentEventModelElement);
        thisObject.showTriggerVisualization(nodeInfo.nodeClicked.modelElement);
    });
    
    function getPaperSentenceIndexFromRawIndex(i,arr){
        var p = 0;
        var s = 0;
        var k;
        while (i>0){
            k = arr[p].length;
            if (i>(k-1)){
                i = i - k;
                p++;
            }
            else{
                s = i;
                i = 0;
            }
        }
        var output = {};
        output.paperIndex = p;
        output.sentenceIndex = s;
        return output;
    }
}

wordTree.prototype.setData = function(){
    //thisObject = this;
    this.listOfConfidence = [1,0.9,0.8,0.2,1,0.9,0.9,0.8,0.8,0.4];
    this.listOfSentences = [['Since Stat3 has been shown to directly bind and regulate the survivin promoter, we sought to determine whether survivin levels were being altered in our experiments'.toLowerCase()],
            ['Studies in human breast cancer cells found that expression of survivin is increased through direct STAT3 binding to the survivin promoter whereas STAT3 inhibition blocks survivin transcription and induces apoptosis of tumor cells .'.toLowerCase()],
            ['Since phospho-STAT3 was reported to bind to the promoter of the survivin gene [32], we assessed survivin expression in human cytomegalovirus-infected HepG2 cells. '.toLowerCase()],
            ['Binding of STAT3 to the core survivin promoter suggests that STAT3 plays a critical role in regulating survivin expression, because the core survivin promoter regulates the majority of transcriptional activity.'.toLowerCase()],
            ['Furthermore, direct inhibition of Stat3 signaling blocked the expression of Survivin protein and induced apoptosis in breast cancer cells.'.toLowerCase()],
            ['Furthermore, the inhibition of STAT3 or IL-6 induced apoptosis and reduced survivin expression, a member of the inhibitor of apoptosis protein family in COX-2-S cells.'.toLowerCase()],
            ['XPO1 inhibition repressed Survivin transcription by inhibiting CREB-binding protein-mediated STAT3 acetylation, and blocking STAT3 binding to the Survivin promoter.'.toLowerCase()],
            ['Leukemia inhibitory factor-induced signal transducer and activator of transcription-3 (STAT3) is responsible for embryonic stem cell survival, and STAT3 regulates Survivin expression in breast cancer cells.'.toLowerCase()],
            ['This was confirmed in Survivin gene promoter studies and chromatin immunoprecipitation assays showing that Stat3 directly binds to and regulates the Survivin promoter.'.toLowerCase()],
            ['The results suggest that increased survivin expression is frequent in ECs and may be dependent on STAT-3 and PI3 K/AKT activation.'.toLowerCase()]];
}

wordTree.prototype.getData = function(eventModelElement){
    //This function can be improved by only using modifiedEvents for the attributes of the evidence that can change (i.e., confidence and polarities). Now modified events is just getting a copy of all the attributes (some that do not change)
    var thisObject = this;
    thisObject.listOfSentences = [];
    thisObject.skipListConfidence = false;
    thisObject.arrayOfSentenceObjects = [];
    
    this.currentEventModelElement = eventModelElement;
    
    //Check if event has been modified
    if (thisObject.currentEventModelElement in thisObject.modifiedEvents){
        thisObject.listOfConfidence = thisObject.modifiedEvents[thisObject.currentEventModelElement].listOfConfidence.slice(0);
        thisObject.arrayOfSentenceObjects = thisObject.modifiedEvents[thisObject.currentEventModelElement].arrayOfSentenceObjects;
        thisObject.arrayOfPaperObjects = thisObject.modifiedEvents[thisObject.currentEventModelElement].arrayOfPaperObjects;
        thisObject.skipListConfidence = true;
    }
    else{
        thisObject.listOfConfidence = [];
        thisObject.arrayOfPaperObjects = [];
    }
    
        
    var packedArray=[ ['Phrases','#sentences','confidence']]
    
    //Used if setData is used (artificial data)
    //this.listOfSentences.forEach(function(elem,index){
        //packedArray.push([elem[0],1,thisObject.listOfConfidence[index]]); 
    //});
    
    thisObject.indexOfPaperObjects = {};
    
    //Used with textualEvidence file that Chryssa prepared
    this.textualEvidence[eventModelElement]['meta']['enriched_evidence']['evidence'].forEach(function(elem,idx){
        thisObject.listOfSentences.push([elem['evidence_text']]);
        if (!thisObject.skipListConfidence){
            thisObject.listOfConfidence.push(elem['uncertainty']?0.5:1);
        }
        //Packed array is what it is sent to the tree
        packedArray.push([elem['evidence_text'],1,thisObject.listOfConfidence[idx]]);
        
        //Updating the proper structure, which in the future will remove the need to have listOfSentences or listOfConfidence
        pubmedId = PMCID ? thisObject.PMCIDtoPMID[elem.paper_id.slice(0,-4)]:elem['paper_id'];
        if (!thisObject.skipListConfidence){
            
            thisObject.arrayOfSentenceObjects.push({"confidence": thisObject.listOfConfidence[idx], "initialConfidence":elem['uncertainty']?0.5:1 ,"text": elem['evidence_text'], "pubmedId": pubmedId, "journalName": thisObject.articleMetaData[pubmedId].fulljournalname, "pubDate": thisObject.articleMetaData[pubmedId].pubdate, "pubCitations": thisObject.articleMetaData[pubmedId].pmcrefcount==""?"0":thisObject.articleMetaData[pubmedId].pmcrefcount, "articleTitle": thisObject.articleMetaData[pubmedId].title});
            
            //This structure is necessary for grouping the sentences by paper
            if (!thisObject.indexOfPaperObjects.hasOwnProperty(pubmedId)){
                thisObject.indexOfPaperObjects[pubmedId] = [];
            }
            thisObject.indexOfPaperObjects[pubmedId].push({"confidence": thisObject.listOfConfidence[idx], "initialConfidence":elem['uncertainty']?0.5:1 ,"text": elem['evidence_text'], "pubmedId": pubmedId, "journalName": thisObject.articleMetaData[pubmedId].fulljournalname, "pubDate": thisObject.articleMetaData[pubmedId].pubdate, "pubCitations": thisObject.articleMetaData[pubmedId].pmcrefcount==""?"0":thisObject.articleMetaData[pubmedId].pmcrefcount, "articleTitle": thisObject.articleMetaData[pubmedId].title, "indexEvidence":idx, "polarity": elem['negation']?-1:1});
        }
    }); 
    if (!thisObject.skipListConfidence){
        //Construct structure to bind the data
        Object.keys(thisObject.indexOfPaperObjects).forEach(function(key,index) {
            // key: the name of the object key
            // index: the ordinal position of the key within the object 
            thisObject.arrayOfPaperObjects.push(thisObject.indexOfPaperObjects[key]);
        });
        thisObject.arrayOfPaperObjects.forEach(function(elem,idx){
            elem[0]["altmetricPct"] = thisObject.textualEvidence[thisObject.currentEventModelElement].meta.enriched_evidence.eventAltmetricScore.pct[idx];
            elem[0]["altmetricScore"] = thisObject.textualEvidence[thisObject.currentEventModelElement].meta.enriched_evidence.eventAltmetricScore.score[idx];
            elem[0]["impactFactor"] = thisObject.textualEvidence[thisObject.currentEventModelElement].meta.enriched_evidence.impactFactor[idx];  
            elem[0].indexPaper = idx;
        });
    }
    return packedArray;
    
}

wordTree.prototype.addWordTree = function(focusedWord,typeTree,eventModelElement){
    var thisObject = this;
    this.currentWord = focusedWord;
      //google.charts.setOnLoadCallback(drawChart);
    
    if (eventModelElement==undefined){
        eventModelElement = this.currentEventModelElement;
    }
    
    if (tutorialEnabled && (tutorialObj.tutorialStep==9)){
        tutorialObj.provideHint();
    }
    
    this.typeTree=typeTree;

    var data = google.visualization.arrayToDataTable(this.getData(eventModelElement));

    var options = {
      wordtree: {
        format: 'implicit',
        type: typeTree,
        //colors: ['red', 'black', 'green'],
        //colors: ['yellow', 'green', 'cyan'],
        word: focusedWord,
        wordSeparator: RegExp(/([!?,;:.&"-]+|\S*[A-Z]\.|\S*(?:[^!?,;:.\s&-]))/),
       tooltip: {trigger: 'none'}
      },
      //maxFontSize: 18,
      colors: ['lightgray','gray', 'black']
      //tooltip: {trigger: 'selection'}
      //enableInteractivity: false
    };

    var chart = new google.visualization.WordTree(document.getElementById('wordTree'));
          
    google.visualization.events.addListener(chart, 'ready', selectHandlerReady);
    google.visualization.events.addListener(chart, 'select', selectHandlerSelect);
    
    chart.draw(data, options);
    
    
    function selectHandlerReady() {
        //Called when the word tree is ready
        
        //thisObject.highlightWordInTree(thisObject.wordsToHighlight1, thisObject.wordsToHighlight2);
        thisObject.highlightWordInTree();
        thisObject.callPreorder();
        
        //Calling the suffix tree implementation running on python
        dataToSend={'listOfSentences':thisObject.listOfSentences.map(function(elem){return elem[0];}), 'word':focusedWord,'listOfConfidence': thisObject.listOfConfidence,'suffix':(thisObject.typeTree=='suffix')};
        //Call parserBiopack
        jQuerySendData(dataToSend,thisObject.scriptSuffixTreeURL);
    }
    
    function selectHandlerSelect() {
        //This is not used anymore
        console.log("now")
        var selectedItem = chart.getSelection()['weight'];
        if (selectedItem>0) {
          alert('The user selected ' + selectedItem);
        }
    }
    
    function jQuerySendData(dataToSend,urlString){
        $.ajax({
            url: urlString,
            data: JSON.stringify(dataToSend),
            type: 'POST',
            contentType: "application/json; charset=utf-8",
            success: calculatedResults,
            error: function(request,error){
                alert("Request: " + JSON.stringify(request) + "eror :" + error);
            }
        });
    }
    function calculatedResults(data){
        thisObject.bindData(data.preorderArray);
    }
}

wordTree.prototype.callPreorder = function(){
    //AJAX call to the CGI script
}

wordTree.prototype.bindData = function (preorderArray){
    //This is to bind the visual objects generated by the google word tree with the suffix tree algorithm
    
    var newDataArray = [];
    var index=0;
    var index2;
    var thisObject = this;
    thisObject.finishingChar = "$"
    var skip=0;
    this.wordTreeContainer.selectAll("text")
    .each(function(){
        if (skip==0){//Check in case text elements were already matched because they are in the same line
if (preorderArray[index]==undefined){
    console.log(index);
    console.log(index)
    d3.select(this).text();
}
            if (d3.select(this).text()==preorderArray[index].words[0]){
                //the order matches with the preorderArray calculated externally
                preorderArray[index].words.forEach(function(elem){
                    if (elem!= thisObject.finishingChar){
                        newDataArray.push({'word':elem, 'priority':preorderArray[index].priority, 'idsx':preorderArray[index].idsx,'level':preorderArray[index].level})
                        skip++;
                    }
                })
                index++;
            }
            else{
                //order does not match with the preorderArray calculated externally
                index2 = index + 1;
                while (!((d3.select(this).text()==preorderArray[index2].words[0]) && (preorderArray[index].level == preorderArray[index2].level))){
                    index2++;
                }
                
                //Check that sons of the one brought forward are also brought forward
                index3 = index2 + 1;
                while (((index3<preorderArray.length) && (preorderArray[index3].level > preorderArray[index2].level))){
                    index3++;
                }
                //removeNodes that are children of the one in index2
                var removedElements = preorderArray.splice(index2, index3 - index2);
                
                removedElements.reverse().forEach(function(elem){
                    preorderArray.splice(index,0,elem);
                })
                
                
 
                //the order now matches with the preorderArray calculated externally

                preorderArray[index].words.forEach(function(elem){
                    if (elem!= thisObject.finishingChar){
                        newDataArray.push({'word':elem, 'priority':preorderArray[index].priority, 'idsx':preorderArray[index].idsx,'level':preorderArray[index].level})
                        skip++;
                    }
                })
                index++;
            }
        }
        skip--;
    });
    
    
    //Add popover message
    this.wordTreeContainer.selectAll("text")
    .data(newDataArray)/*,function(d){return });*/
    .attr("id",function(d,i){return d.word+'-'+d.priority;})//Removing the id set by google charts is the only way I could find to stop the events
    .attr("data-toggle", "popover")
    .attr("title",function(d,i){return d.word})
    .attr("data-content", function(d,i){
        return (d.idsx.length==1?thisObject.listOfSentences[d.idsx[0]]+"<br />":"") + "<b>Average confidence:</b> " + d.priority+ "<br /><b>Appearing in sentence#: </b>"+ d.idsx.join([separator = ',']) + "<br /><br />Click to adjust event confidence <br/>Shift-click to go to publication";
      })
    .on("mousedown", function(d,i){
            thisObject.mouseDownWordTree(d,i,thisObject);
    })
    .on("mouseover", thisObject.mouseOverWordTree);
    
    $('text[data-toggle="popover"]').popover({
		placement : 'top',
        container: 'body',
        html: 'true',
        viewport: '#wordTree',
        trigger: 'hover'
    });
    
}

wordTree.prototype.mouseOverWordTree = function(d,i){
    
    //console.log(d3.select(this).data()[0]);
    
}

wordTree.prototype.openPubmedPublication = function(pubmedId){
    //Open pubmed publication in a new tab
    
    //var thisObject = this;
    //var evidences = thisObject.textualEvidence[thisObject.currentEventModelElement]['meta']['enriched_evidence'];
    //var pubmedId = this.arrayOfSentenceObjects[i].pubmedId; 
    //var pubmedId = thisObject.PMCID ? thisObject.PMCIDtoPMID[evidences.evidence[i].paper_id.slice(0,-4)]:evidences.evidence[i].paper_id;
    window.open('https://www.ncbi.nlm.nih.gov/pubmed/' + pubmedId);
}

wordTree.prototype.mouseDownWordTree = function(d,i, thisObject){
    
    var thisObj = thisObject;
    var eventIsEnabled = dataFBL.nodes[dataFBL.mappingModelElementIndex[thisObject.currentEventModelElement]].confidenceEnabled;
    
    if (d3.event.shiftKey) {
        d.idsx.forEach(function(elem,idx){
            //elem contains all the sentence index
            thisObject.openPubmedPublication(thisObject.arrayOfSentenceObjects[elem].pubmedId);        
        });
        
    }
    else{
        a=1;
        var dataToAdd = d3.select("#changeConfidenceModal")
                        .select(".modal-body")
                        .selectAll("p")
                        .data(d.idsx)
                        .attr("class","sentenceText")
                        .html(function(dd,ii){
                            return thisObject.listOfSentences[dd][0]+ '<br><form class="form-horizontal"><div class="form-group"><label for="inputRangeConfidence'+ii+'" class="control-label col-xs-4">Confidence: <span id="spanAdjustConfidence'+ii+'">'+thisObject.listOfConfidence[dd]+'</span></label><div class="col-xs-8"><input type="range" class="form-control" min ="0" max="1" step ="0.01" value ="' + thisObject.listOfConfidence[dd] + '"id="inputRangeConfidence'+ii+'" ' + (eventIsEnabled?'':'disabled ') + '></div></div></form>';
                        });
        
        dataToAdd.enter().append("p")
        .attr("class","sentenceText")
        .html(function(dd,ii){
            return thisObject.listOfSentences[dd][0]+ '<br><form class="form-horizontal"><div class="form-group"><label for="inputRangeConfidence'+ii+'" class="control-label col-xs-4">Confidence: <span id="spanAdjustConfidence'+ii+'">'+thisObject.listOfConfidence[dd]+'</span></label><div class="col-xs-8"><input type="range" class="form-control" min ="0" max="1" step ="0.01" value ="' + thisObject.listOfConfidence[dd] + '"id="inputRangeConfidence'+ii+'" ' + (eventIsEnabled?'':'disabled') + '></div></div></form>';

        });
        
        dataToAdd.exit().remove();
        
        d3.select("#changeConfidenceModal")
        .select(".modal-body").append("p")
        .attr("class","text-warning")
        .html(eventIsEnabled?"<small>If you don't save, your changes will not be updated.</small>":"<small>Overall event confidence has been overriden by user, so no fine adjustment can be made.</small>");
        
        $("#changeConfidenceModal").modal('show');
        
        //Add listener for ranges
        d3.select("#changeConfidenceModal").selectAll("input")
        .on("input", function(d,i){
            d3.select("#spanAdjustConfidence"+i)
            .html(this.value)
        }
        );
    }
    
}

wordTree.prototype.changedOrder = function(typeTree){
    //This modifies whether a suffix or prefix tree is used
    this.addWordTree(this.currentWord, typeTree, this.currentEventModelElement);
}    

wordTree.prototype.underlineSentenceLeftG = function(sentence){
    var listOfWords=sentence.split(/([!?,;:.&"-]+|\S*[A-Z]\.|\S*(?:[^!?,;:.\s&-]))/);
    var lastWord = lastWordSentence(listOfWords);
    var lastSelection;
    var rightMostValue = 0;
    var maxRightMostValue = this.wordTreeContainer.attr("width")/2;
    //in addition of using righmost it should be done traversing the tree (specially when traversing the tree for the inner nodes)
    
    
    d3.select(".leftG").selectAll("text")
    .each(function(d,i){
        var horizPosition = d3.select(this).attr("x");
        if ((d3.select(this).html()== lastWord)&&(horizPosition>rightMostValue)&&(horizPosition<=maxRightMostValue)&&(this.previousElementSibling.tagName=='path')){
            rightMostValue = horizPosition;
            lastSelection = this;
            lastSelectionId = i;
        }
    })
    var tagName = lastSelection.tagName;
    while (tagName=='text'){
        //d3.select(lastSelection).attr("class","underlinedWord")
        d3.select(lastSelection).style("text-decoration","underline")
        lastSelection = lastSelection.nextElementSibling;
        tagName = lastSelection.tagName;        
    }
    
    function lastWordSentence(listOfWords){
        
        lastWord = listOfWords.pop();
        while ((lastWord=="")||(lastWord==" ")){
            lastWord = listOfWords.pop();
        }
        return lastWord;
    }
}

wordTree.prototype.setToHighlightWords = function(currentEventModelElement){
    var thisObject = this;
    var evidences = this.textualEvidence[currentEventModelElement]['meta']['enriched_evidence']
    
    this.wordsToHighlight1 = evidences['enriched_participant_a'].map(function(elem,idx){
        return elem['text'];
    });
    
    this.wordsToHighlight2 = evidences['enriched_participant_b'].map(function(elem,idx){
        return elem['text'];
    });
    
    this.wordsToHighlight3 = evidences['enriched_trigger'].map(function(elem,idx){
        return elem['text'];
    });
    
    
    /*
    this.wordsToHighlight1 = array1;
    this.wordsToHighlight2 = array2;
    this.wordsToHighlight3 = array3;*/
}

wordTree.prototype.highlightWordInTree = function(wordToHighlight1,wordToHighlight2){
    var thisObject = this;
    
    d3.selectAll("#wordTree").selectAll("text")
    .each(function(d,i){
        /*
        if (d3.select(this).select("span").empty()){
            //Add span to each word
            var currentWord = d3.select(this).html();
            var newWord = currentWord == wordToHighlight ? '<span class="highlightedWord">' + currentWord + '</span>': '<span class="nonHighlightedWord">' + currentWord + '</span>';
            d3.select(this).html(newWord)
        }
        else{
            var currentWord = d3.select(this).select("span").html();
            var newSpanClass = currentWord == wordToHighlight ? 'highlightedWord': 'nonHighlightedWord';
            d3.select(this).select("span").attr("class",newSpanClass);
        }*/
        
        var currentWord = d3.select(this).html();
        //var newClass = (currentWord == wordToHighlight1) || (currentWord == wordToHighlight2)? ((currentWord == wordToHighlight1)?'highlightedWord1':'highlightedWord2'):'nonHighlightedWord1';
        var newClass;
        if ((thisObject.wordsToHighlight1.indexOf(currentWord)>-1) || (thisObject.wordsToHighlight2.indexOf(currentWord)>-1)||(thisObject.wordsToHighlight3.indexOf(currentWord)>-1)){
            if (thisObject.wordsToHighlight1.indexOf(currentWord)>-1){
                newClass = 'highlightedWordEntity1';
            }
            else{
                if (thisObject.wordsToHighlight2.indexOf(currentWord)>-1){
                    newClass = 'highlightedWordEntity2';
                }
                else{
                    newClass = 'highlightedWordTrigger';
                }
                
            }
        }
        else{
            newClass = 'nonHighlightedWord';
        }
            
        d3.select(this).attr("class",newClass);
    })
}

/*
wordTree.prototype.highlightWordInPlainSentences = function(wordToHighlight1,wordToHighlight2){
    d3.selectAll(".sentenceClass").selectAll("span")
    .each(function(d,i){        
        var currentWord = d3.select(this).html();
        //var newClass = (currentWord == wordToHighlight1) || (currentWord == wordToHighlight2)? ((currentWord == wordToHighlight1)?'highlightedWord1':'highlightedWord2'):'nonHighlightedWord1';
        var newClass = (wordToHighlight1.indexOf(currentWord)>-1) || (wordToHighlight2.indexOf(currentWord)>-1)? ((wordToHighlight1.indexOf(currentWord)>-1)?'highlightedWord1':'highlightedWord2'):'nonHighlightedWord';
        d3.select(this).attr("class",newClass);
    })
}

wordTree.prototype.highlightWordInPlainSentences_AttemptAfterBreakDownInSpans = function(){
    
    d3.selectAll(".plainSentences").each(function(d,sentenceIndex){
        if (sentenceIndex==0){
            d3.select(this).selectAll(".spanPlainSentence").each(function(dd,ii){
                console.log(d3.select(this).html())
            })
         }
    })
    
    
}


wordTree.prototype.inputIndividualSentenceModified_old = function(contextInput){
    //This is called from showIndividualSentences when the confidence slider is moved
    
    var thisObject = this; 
    //Change label
    d3.select("#spanAdjustConfidencePlain"+d3.select(contextInput).attr("id").split("inputRangeConfidencePlainSentence")[1])
    .html(parseFloat(contextInput.value).toFixed(2));
    
    //Change value on internal attributes
    thisObject.listOfConfidence[parseInt(d3.select(contextInput).attr("id").split("inputRangeConfidencePlainSentence")[1])] = parseFloat(contextInput.value);
    
    this.actionsWhenIndividualConfidenceChanged();
}
*/
wordTree.prototype.inputIndividualSentenceModified = function(d,indexSentence, contextInput){
    var thisObject = this; 
    
    var sentenceConfidence = Math.abs(contextInput.value);
    var sentencePolarity = ((contextInput.value>=0)?1:-1);
    
    //Change sentence confidence label
    d3.select(contextInput.parentElement.parentElement)
    .select("#spanAdjustConfidencePlainSentence"+indexSentence)
    .html(parseFloat(Math.abs(sentenceConfidence)).toFixed(2));
    
    //Change polarity label and class
    d3.select(contextInput.parentElement.parentElement)
    .select("#spanAdjustPolarityPlainSentence"+indexSentence)
    .attr("class",(sentencePolarity>=0)?("positiveSentenceClass"):("negativeSentenceClass"))
    .html((sentencePolarity>=0)?("Positive sentence"):("Negative sentence"));
    
    
    //Update value of sentence confidence
    d[indexSentence].confidence = parseFloat(sentenceConfidence);//this also updates arrayOfPaperObjects
    d[indexSentence].polarity = sentencePolarity;//this also updates arrayOfPaperObjects
        
    //Update the data structures that modified events will read from
    thisObject.listOfConfidence[d[indexSentence].indexEvidence] = parseFloat(sentenceConfidence);
    thisObject.arrayOfSentenceObjects[d[indexSentence].indexEvidence].confidence = parseFloat(sentenceConfidence);
    thisObject.arrayOfSentenceObjects[d[indexSentence].indexEvidence].polarity = parseFloat(sentencePolarity);
    thisObject.arrayOfPaperObjects[d[0].indexPaper][indexSentence].confidence = parseFloat(sentenceConfidence);
    thisObject.arrayOfPaperObjects[d[0].indexPaper][indexSentence].polarity = parseFloat(sentencePolarity);
    
    //Select the elements for the language paper-level confidence elements
    var selection = d3.select(contextInput.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement).select(".confidencePaperSlidebar");
    
    //Compute new paper-level confidence 
    var sum = 0; 
    d.forEach(function(dd,ii){
        //Change value on internal attributes
        sum = sum + dd.confidence * dd.polarity;
        
    });        
    var paperAvg = sum / d.length;
    
    //find bound data associated to the event -- not necessary can use arrayOfPaperObjects
    //var allData = d3.select(contextInput.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement).selectAll(".plainPapers").data();
    
    //Call update on paper-level confidence
    this.updatePaperConfidenceChanged(paperAvg, selection);
}

wordTree.prototype.updatePaperConfidenceChanged = function (signedPaperLevelConfidence, selection){
    //This is called from inputIndividualSentenceModified and addListenersForWordTree after sentence confidence is updated
    
    var paperLevelConfidence = Math.abs(signedPaperLevelConfidence);
    //Change label besides paper slidebar
    selection.select("label").select("span")
    .html(parseFloat(paperLevelConfidence).toFixed(2));
    
    //Change paper polarity label and class
    selection
    .select("#spanAdjustPolarityPlainPaper")
    .attr("class",(signedPaperLevelConfidence>=0)?("positiveSentenceClass"):("negativeSentenceClass"))
    .html((signedPaperLevelConfidence>=0)?("Positive event"):("Negative event"));
    
    //Move paper confidence slidebar
    selection.select("input").node().value = parseFloat(signedPaperLevelConfidence);
    
    //Compute new general language-level confidence 
    var sumGen = 0; 
    this.arrayOfPaperObjects.forEach(function(ddd,iii){
        var sumInt = 0
        ddd.forEach(function(dd,ii){
            sumInt = sumInt + dd.confidence * dd.polarity;
        });
        //Change value on internal attributes
        sumGen = sumGen + sumInt / ddd.length;
    });        
    var eventLangConfidence = sumGen / this.arrayOfPaperObjects.length;
    
    this.updateGeneralLanguageConfidence(eventLangConfidence);
}

wordTree.prototype.updateGeneralLanguageConfidence = function(signedEventLangConfidence){
    var thisObject = this;
    //Change value on node data
    var indexNode = dataFBL.mappingModelElementIndex[this.currentEventModelElement][0];
    var indexWeight1 = dataFBL.nodes[indexNode].connectedLinkIndex[0];
    var indexWeight2 = dataFBL.nodes[indexNode].connectedLinkIndex[1];
    
    dataFBL.nodes[indexNode].languageCertainty = Math.abs(signedEventLangConfidence);
    dataFBL.nodes[indexNode].polarity = (signedEventLangConfidence>=0)?1:-1;
    
    generalEventConfidence = eventAgg.computeAggregatedValue(dataFBL.nodes[indexNode],eventAgg.SIMPLE_AVERAGE);
    
    dataFBL.nodes[indexNode].value = generalEventConfidence;
    
    dataFBL.weights[indexWeight1].value = generalEventConfidence;
    dataFBL.weights[indexWeight2].value = generalEventConfidence;
    
    //Update graph (some events may have changed polarity)
    visualizeGraphAfterPolarityFiltering();
    
    //Update node inspector
    nodeInfo.addNodeInfo(nodeInfo.lastNodeInspected, nodeInfo.visObj);
    
    //Change hash of values already modified
    this.modifiedEvents[this.currentEventModelElement] = {}
    this.modifiedEvents[this.currentEventModelElement].listOfConfidence = clone(this.listOfConfidence);
    this.modifiedEvents[this.currentEventModelElement].arrayOfSentenceObjects = thisObject.arrayOfSentenceObjects.slice(0);
    this.modifiedEvents[this.currentEventModelElement].arrayOfPaperObjects = thisObject.arrayOfPaperObjects.slice(0);
}



wordTree.prototype.inputIndividualPaperModified = function(d,indexPaper,contextInput){
    //This is called from showIndividualSentences when the confidence slider is moved
    
    var thisObject = this; 
    
    var paperConfidenceValue = Math.abs(contextInput.value);
    var paperPolarity = ((contextInput.value>=0)?1:-1);
    
    //Backwards consistency
    //Adjust sentence-level values to make them consistent with the user input at the paper level
    d.forEach(function(dd,ii,fullList){
        //Change value on internal sentences
        dd.confidence = parseFloat(paperConfidenceValue); //this also updates arrayOfPaperObjects
        
        //Change polarity on internal sentences
        dd.polarity = paperPolarity;
        
        //Change label on sentence ranges
        d3.select(contextInput.parentElement.parentElement.parentElement.parentElement.parentElement).select(".expandableSentencesDiv").select("#spanAdjustConfidencePlainSentence"+ii)
        .html(parseFloat(paperConfidenceValue).toFixed(2));
        
        //Change polarity label and class
        d3.select(contextInput.parentElement.parentElement.parentElement.parentElement.parentElement).select(".expandableSentencesDiv")
        .select("#spanAdjustPolarityPlainSentence"+ii)
        .attr("class",(paperPolarity>=0)?("positiveSentenceClass"):("negativeSentenceClass"))
        .html((paperPolarity>=0)?("Positive sentence"):("Negative sentence"));
        
        //Move sentence confidence slidebar
        d3.select(contextInput.parentElement.parentElement.parentElement.parentElement.parentElement).select(".expandableSentencesDiv").select("#inputRangeConfidencePlainSentence"+ii).node().value = parseFloat(paperConfidenceValue)*paperPolarity;
        
        //Update the data structures that modified events will read from
        thisObject.listOfConfidence[dd.indexEvidence] = parseFloat(paperConfidenceValue);
        thisObject.arrayOfSentenceObjects[dd.indexEvidence].confidence = parseFloat(paperConfidenceValue);
        thisObject.arrayOfSentenceObjects[dd.indexEvidence].polarity = parseFloat(paperPolarity);
        thisObject.arrayOfPaperObjects[fullList[0].indexPaper][ii].confidence = parseFloat(paperConfidenceValue);
        thisObject.arrayOfPaperObjects[fullList[0].indexPaper][ii].polarity = parseFloat(paperPolarity);
        
    });
    
    var selection = d3.select(contextInput.parentElement.parentElement.parentElement.parentElement);
    
    //Call update on paper-level confidence
    this.updatePaperConfidenceChanged(paperConfidenceValue*paperPolarity, selection);
}

wordTree.prototype.participantsOrLemmaChanged = function(){
    //called after events on participants and checkbox is fired
    var participants = $("#selPart1").val();
    this.participant1 = participants.split(' - ')[0];
    this.participant2 = participants.split(' - ')[1];
    
    this.getTriggers($("#triggerVisCheckbox").is(":checked"));
}

wordTree.prototype.showTriggerVisualization = function(eventModelElement){
    //This is when the trigger visualization nav-pill is clicked
    var thisObject = this;
    
    //Find participants     
    var listOfParticipants = getParticipantPairs(thisObject.textualEvidence[thisObject.currentEventModelElement]['meta']['enriched_evidence']);
    /*var listOfParticipants1 = getParticipants(thisObject.textualEvidence[thisObject.currentEventModelElement]['meta']['enriched_evidence'].enriched_participant_a);
    var listOfParticipants2 = getParticipants(thisObject.textualEvidence[thisObject.currentEventModelElement]['meta']['enriched_evidence'].enriched_participant_b);*/
    
    //Put participants in drop-down list
    putParticipantsInList("#selPart1", listOfParticipants);
    /*putParticipantsInList("#selPart2", listOfParticipants2);*/
    
    var participants = $("#selPart1").val();
    this.participant1 = participants.split(' - ')[0];
    this.participant2 = participants.split(' - ')[1];
    /*this.participant2 = $("#selPart2").val();*/
    
    this.triggerVisualizationDims = [parseInt(d3.select("#triggerVisualizationSVG").attr("width")), parseInt(d3.select("#triggerVisualizationSVG").attr("height"))];
    
    //get triggers with frequency
    this.getTriggers($("#triggerVisCheckbox").is(":checked"));
    
    
    function getParticipants(evidence){
        var unique = {};
        var listOfParticipants = [];
        evidence.forEach(function(elem,idx){
            if (typeof(unique[elem.text]) == "undefined"){
                listOfParticipants.push(elem.text);
            }
            unique[elem.text] = true;
        })
        return listOfParticipants;
    }
    
    function getParticipantPairs(evidence){
        var unique = {};
        var listOfParticipants = [];
        var participantPair;
        evidence.enriched_participant_a.forEach(function(elem,idx){
            participantPair = elem.text + " - " + evidence.enriched_participant_b[idx].text;
            if (typeof(unique[participantPair]) == "undefined"){
                listOfParticipants.push(participantPair);
            }
            unique[participantPair] = true;
        })
        return listOfParticipants;
    }
    
    function putParticipantsInList(selection, listOfParticipants){
        part1Selection = d3.select(selection).selectAll("option")
        .data(listOfParticipants)
        .html(function(d){
            return d;
        });
        
        part1Selection.enter().append("option")
        .html(function(d){
            return d;
        });
        
        part1Selection.exit().remove();
    }

}

wordTree.prototype.getTriggers = function(lemmatized){
    var thisObject = this;
    //Decides whether it uses the list of triggers from the evidence or use that one to feed the lemmatizer
    var evidence = thisObject.textualEvidence[thisObject.currentEventModelElement]['meta']['enriched_evidence'];
    var dataToSend = {"verbs": evidence.enriched_trigger.map(function(elem){
        return elem.text;
    })}
    
    if (lemmatized){
        //This should be added the first time the trigger visualization is pressed
        var lemmatizer = new Lemmatizer();
        var lemmatizedWords = [];
        dataToSend.verbs.forEach(function(elem){
            lemmatizedWords.push(lemmatizer.lemmas(elem,((elem.slice(-4)=='tion')||(elem.slice(-5)=='tions'))?'noun':'verb')[0][0]);
        })
        calculatedTriggers(lemmatizedWords);
        //jQuerySendData(dataToSend,thisObject.scriptLemmatizerURL);
    }
    else{
        calculatedTriggers(dataToSend["verbs"]);
    }
    
    
    function jQuerySendData(dataToSend,urlString){
            $.ajax({
                url: urlString,
                data: JSON.stringify(dataToSend),
                type: 'POST',
                contentType: "application/json; charset=utf-8",
                success: calculatedTriggers,
                error: function(request,error){
                    alert("Request: " + JSON.stringify(request) + "eror :" + error);
                }
            });
    }
    
    function calculatedTriggers(data){
        var evidence = thisObject.textualEvidence[thisObject.currentEventModelElement]['meta']['enriched_evidence'];
        var unique = {};
        thisObject.listOfTriggers = [];
        
        data = data.map(function(elem){return {"text": elem};});
        
        data.forEach(function(elem, idx){
            if ((evidence.enriched_participant_a[idx].text == thisObject.participant1) && (evidence.enriched_participant_b[idx].text == thisObject.participant2)) {
                if (typeof(unique[elem.text]) == "undefined"){
                    thisObject.listOfTriggers.push({"text":elem.text, "freq": 1});
                    unique[elem.text] = [{"idx":idx, "lidx": Object.keys(unique).length}];
                    //unique[elem.text] = Object.keys(unique).length;
                }
                else{
                    thisObject.listOfTriggers[unique[elem.text][0].lidx]["freq"] =  unique[elem.text].length +1;
                    unique[elem.text].push({"idx":idx});
                }
            }
        });
        
        thisObject.unique = clone(unique);
        
        //arrange trigger words vertically
        wt.arrangeTriggers();
        
        //arrange participants in the middle
        wt.arrangeParticipants();
        
        //draw spline lines connecting participants and triggers
        wt.arrangeSplineLines();        
    }
}

wordTree.prototype.arrangeSplineLines = function(){
    var thisObject = this;
    
    var width = this.triggerVisualizationDims[0];
    var height = this.triggerVisualizationDims[1];
    
    var splineColorScale = d3.scale.linear().domain([0,1]).range(["lightgray","darkgray"]);
    var splineStrokeScale = d3.scale.pow().exponent(3).domain([0,1]).range([0.5,2.5]);
    
    //Add group for spline in the left
    leftSplineGroup = d3.select("#triggerVisualizationSVG").selectAll(".leftSplineGroup")
    .data([1]);
    
    leftSplineGroup.enter().append("g").attr("class","leftSplineGroup")
    
    //Add group for spline in the right
    rightSplineGroup = d3.select("#triggerVisualizationSVG").selectAll(".rightSplineGroup")
    .data([1]);
    
    rightSplineGroup.enter().append("g").attr("class","rightSplineGroup")
    
    //Add spline lines in the leftSplineGroup ------------------------
    var line = d3.svg.line();
    line.interpolate("basis");
    
    //Form an array with as many components as splines lines we need, each component has 4 arrays, of [x,y] points 
    var extraGap = 5;
    var participant1Width = d3.select(".participant1Group").select("text")[0][0].getBBox().width;
    var participant1Height = d3.select(".participant1Group").select("text")[0][0].getBBox().height;
    var participant1Coordinates = [parseInt(d3.select(".participant1Group").attr("transform").split(',')[0].split('(')[1]) + participant1Width + extraGap, parseInt(d3.select(".participant1Group").attr("transform").split(',')[1].split(')')[0]) - participant1Height/4];
    var allSplinePoints = [];//[[0, height/2],[100,height/2],[width/2-100,10],[width/2, 10]];
    var partTrigHorSep, triggerX, triggerY;
    this.listOfTriggers.forEach(function(d,i){
        pointsLine = [];
        triggerY = thisObject.verticalPositionTrigger(i);
        triggerX = thisObject.triggerVisualizationDims[0]/2 - extraGap - thisObject.barWidth.range()[1]/2;
        
        partTrigHorSep = triggerX - participant1Coordinates[0]
        pointsLine.push(participant1Coordinates)
        pointsLine.push([participant1Coordinates[0] + partTrigHorSep/3, participant1Coordinates[1]])
        pointsLine.push([participant1Coordinates[0] + partTrigHorSep*2/3, triggerY]); //+this.getBoundingClientRect().height/2])
        pointsLine.push([triggerX, triggerY]);//+this.getBoundingClientRect().height/2])
        allSplinePoints.push(pointsLine);
    });
    
    var splines = d3.select(".leftSplineGroup").selectAll(".leftSplineLines").data(allSplinePoints)
    .attr("stroke",setSplineColor)
    .attr("stroke-width", setSplineWidth);
    
    splines.call(redraw);
    
    splines.enter().append("path").data(allSplinePoints)
    .attr("class", "leftSplineLines")
    .attr("stroke",setSplineColor)
    .attr("stroke-width", setSplineWidth)
    .call(redraw);
    
    var splinesArrows = d3.select(".leftSplineGroup").selectAll(".leftSplineArrowHeads").data(allSplinePoints);
    
    splinesArrows.call(redrawArrowHeads);
    
    splinesArrows.enter().append("path").data(allSplinePoints).attr("class", "leftSplineArrowHeads").call(redrawArrowHeads);
    
    //Remove left splines and their arrows
    splines.exit().remove();
    splinesArrows.exit().remove();

    
    //Add  spline lines in the rightSplineGroup
    participant2Width = d3.select(".participant2Group").select("text")[0][0].getBBox().width;
    participant2Height = d3.select(".participant2Group").select("text")[0][0].getBBox().height;
    participant2Coordinates = [parseInt(d3.select(".participant2Group").attr("transform").split(',')[0].split('(')[1]) - extraGap, parseInt(d3.select(".participant2Group").attr("transform").split(',')[1].split(')')[0]) - participant2Height/4];
    var allSplinePoints = [];//[[0, height/2],[100,height/2],[width/2-100,10],[width/2, 10]];
    var partTrigHorSep, triggerX, triggerY;
    this.listOfTriggers.forEach(function(d,i){
        pointsLine = [];
        triggerY = thisObject.verticalPositionTrigger(i);
        triggerX = thisObject.triggerVisualizationDims[0]/2 + thisObject.barWidth.range()[1]/2 + extraGap;
        
        partTrigHorSep = participant2Coordinates[0] - triggerX
        
        pointsLine.push([triggerX, triggerY])
        pointsLine.push([triggerX + partTrigHorSep*1/3, triggerY])
        pointsLine.push([triggerX + partTrigHorSep*2/3, participant2Coordinates[1]])
        pointsLine.push(participant2Coordinates)
        allSplinePoints.push(pointsLine);
    });
    
    var splines = d3.select(".rightSplineGroup").selectAll(".rightSplineLines").data(allSplinePoints)
    .attr("stroke",setSplineColor)
    .attr("stroke-width", setSplineWidth);
    
    splines.call(redraw);
    
    splines.enter().append("path").data(allSplinePoints)
    .attr("class", "rightSplineLines")
    .attr("stroke",setSplineColor)
    .attr("stroke-width", setSplineWidth)
    .call(redraw);
    
    var splinesArrows = d3.select(".rightSplineGroup").selectAll(".rightSplineArrowHeads").data(allSplinePoints);
    
    splinesArrows.call(redrawArrowHeads2);
    
    splinesArrows.enter().append("path").data(allSplinePoints).attr("class", "rightSplineArrowHeads").call(redrawArrowHeads2);
    
    splines.exit().remove();
    splinesArrows.exit().remove();
    
    function redraw(){
        //d3.selectAll(".leftSplineLines").attr("d", line);
        this.transition().duration(1000).attr("d", line);
    }
    function redrawArrowHeads(){
        //d3.selectAll(".leftSplineArrowHeads")//.append("svg:path")        
        this//.append("svg:path")   
        .transition().duration(1000)
        .attr("d", function(d,i){
            triggerY = thisObject.verticalPositionTrigger(i);
            triggerX = thisObject.triggerVisualizationDims[0]/2 - thisObject.barWidth.range()[1]/2;
            return "M" + (triggerX- extraGap - 5) + "," + (triggerY+5) + "l6.078685485212741,-5.26429605180997 -6.078685485212741,-5.26429605180997Z";
        })
    }
    function redrawArrowHeads2(){
        //d3.selectAll(".leftSplineArrowHeads")//.append("svg:path")        
        this//.append("svg:path")        
        .attr("d", function(d,i){
            return "M" + (participant2Coordinates[0] - 5) + "," + (participant2Coordinates[1]+5) + "l6.078685485212741,-5.26429605180997 -6.078685485212741,-5.26429605180997Z";
        })
    }
    
    function setSplineColor(d,i){
        var avgConfidence = 0;
        thisObject.unique[thisObject.listOfTriggers[i].text].forEach(function(elem,ii){
            avgConfidence = avgConfidence + thisObject.arrayOfSentenceObjects[elem.idx].confidence;
        })
        avgConfidence = (1.0*avgConfidence / thisObject.unique[thisObject.listOfTriggers[i].text].length).toFixed(2)
        return splineColorScale(avgConfidence);
    }
    
    function setSplineWidth(d,i){
        var avgConfidence = 0;
        thisObject.unique[thisObject.listOfTriggers[i].text].forEach(function(elem,ii){
            avgConfidence = avgConfidence + thisObject.arrayOfSentenceObjects[elem.idx].confidence;
        })
        avgConfidence = (1.0*avgConfidence / thisObject.unique[thisObject.listOfTriggers[i].text].length).toFixed(2)
        return splineStrokeScale(avgConfidence);
    }
}

wordTree.prototype.arrangeParticipants = function(){
    var leftMargin = 30;
    var rightMargin = 30;
    
    var thisObject = this;
    var width = this.triggerVisualizationDims[0];
    var height = this.triggerVisualizationDims[1];
    
    //Participant 1
    //Modify groups
    var participant1Group = d3.select("#triggerVisualizationSVG").selectAll(".participant1Group")
                        .data([thisObject.participant1])
                        .attr("transform", function (d,i){
                            return "translate("+leftMargin + "," + height/2+")";
                        });
    //Modify text
    participant1Group.select("text")
                .text(function(d,i){
                    return d;
                });
                
    
    //Add groups
    participant1GroupAdded = participant1Group.enter().append("g")
    .attr("class","participant1Group")
    .attr("transform", function (d,i){
        return "translate("+leftMargin + "," + height/2+")";
    });
    
    //Add text
    participant1GroupAdded.append("text")
    .text(function(d,i){
        return d
    });
    
    //Participant 2
    //Modify groups
    var participant2Group = d3.select("#triggerVisualizationSVG").selectAll(".participant2Group")
                        .data([thisObject.participant2])
                        .attr("transform", function (d,i){
                            return "translate("+(width - rightMargin) + "," + height/2+")";
                        });
    //Modify text
    participant2Group.select("text")
                .text(function(d,i){
                    return d;
                });
                
    
    //Add groups
    participant2GroupAdded = participant2Group.enter().append("g")
    .attr("class","participant2Group")
    .attr("transform", function (d,i){
        return "translate("+(width - rightMargin) + "," + height/2+")";
    });
    
    //Add text
    participant2GroupAdded.append("text")
    .text(function(d,i){
        return d
    });
    
}


wordTree.prototype.arrangeTriggers = function(){
    var thisObject = this;
    var topMargin = 10;
    var bottomMargin = 10;
    
    var triggerProportionMargin = 2;
    var maxBarWidth = 200;
    
    var rectHeight = 10;
    var rectOffset = 5;
    
    var width = this.triggerVisualizationDims[0];
    var height = this.triggerVisualizationDims[1];
    
    
    
    this.barWidth = d3.scale.linear().domain([0,thisObject.listOfSentences.length]).range([0,maxBarWidth]);
    this.verticalPositionTrigger = d3.scale.ordinal()
                            .domain(d3.range(thisObject.listOfTriggers.length))
                            .rangeBands([topMargin, height - bottomMargin]);
    
    //Modify groups
    var triggerGroups = d3.select("#triggerVisualizationSVG").selectAll(".triggerGroup")
                        .data(this.listOfTriggers)
                        .attr("data-original-title", function (d,i){
                            return thisObject.participant1 + " &rarr; " + thisObject.listOfTriggers[i].text + " &rarr; " +thisObject.participant2;
                        })
                        .attr("data-content", popoverContent);
                        
                        
    triggerGroups.transition().duration(1000)
                .attr("transform", function (d,i){
                            return "translate("+(width/2 - thisObject.barWidth.range()[1]/2) + "," + thisObject.verticalPositionTrigger(i)+")";
                        });
    //Modify text
    triggerGroups.select(".trigger")
                .text(function(d,i){
                    return d.text;
                });
    
    //Modify text proportion value
    triggerGroups.select(".triggerProportion")
                .attr("x",function(d,i){
                    if (d.freq > thisObject.listOfSentences.length/2){
                        return triggerProportionMargin;
                    }
                    else{
                        return maxBarWidth - triggerProportionMargin;
                    }
                })
                .attr("text-anchor",function(d,i){
                    if (d.freq > thisObject.listOfSentences.length/2){
                        return "start";
                    }
                    else{
                        return "end";
                    }
                })
                .style("fill",function(d,i){
                    if (d.freq > thisObject.listOfSentences.length/2){
                        return "white";
                    }
                    else{
                        return "black";
                    }
                })
                .text(function(d,i){
                    return d.freq + "/" + thisObject.listOfSentences.length;
                });
                
    //Modify rect
    triggerGroups.select(".proportionRect")
    .transition().duration(1000)
    .attr("width", function(d,i){
        return thisObject.barWidth(d.freq);
    });
    
    //Add groups
    triggerGroupsAdded = triggerGroups.enter().append("g")
    .attr("class","triggerGroup")
    .attr("data-toggle", "popover")
    .attr("data-original-title", function (d,i){
        return thisObject.participant1 + " &rarr; " + thisObject.listOfTriggers[i].text + " &rarr; " +thisObject.participant2;
    })
    .attr("data-content", popoverContent)
    .attr("transform", function (d,i){
        return "translate("+(width/2 - thisObject.barWidth.range()[1]/2)+ ","+thisObject.verticalPositionTrigger(i)+")";
    })
    .on("mousedown", function(d,i){
        var sentencesInvolved = thisObject.unique[d.text].map(function(elem){return elem.idx;});
        var dummy = {"idsx": sentencesInvolved}
        thisObject.mouseDownWordTree(dummy,"foo",thisObject);
    });
    

    $('.triggerGroup').popover({
		placement : 'right',
        container: 'body',
        html: 'true',
        viewport: '#triggerVisualizationSVG',
        trigger: 'hover'
    });
    
    //Add rect
    triggerGroupsAdded.append("rect")
    .attr("class", "proportionRect")
    .attr("x", "0")
    .attr("y", rectOffset)
    .attr("height", rectHeight)
    .attr("width", function(d,i){
        return thisObject.barWidth(d.freq);
    })
    .style("fill","steelblue");
    
    //Add reference rect
    triggerGroupsAdded.append("rect")
    .attr("class", "referenceRect")
    .attr("x", "0")
    .attr("y", rectOffset)
    .attr("height", rectHeight)
    .attr("width", maxBarWidth)
    .style("fill", "none")
    .style("stroke","black")
    .style("stroke-width","0.5");
    
    //Add trigger text
    triggerGroupsAdded.append("text")
    .attr("class","trigger")
    .text(function(d,i){
        return d.text;
    });
    
    //add trigger proportion value
    triggerGroupsAdded.append("text")
    .attr("class","triggerProportion")
    .attr("x",function(d,i){
        if (d.freq>thisObject.listOfSentences.length/2){
            return triggerProportionMargin;
        }
        else{
            return maxBarWidth - triggerProportionMargin;
        }
    })
    .attr("text-anchor",function(d,i){
        if (d.freq>thisObject.listOfSentences.length/2){
            return "start";
        }
        else{
            return "end";
        }
    })    
    .attr("y",rectOffset + rectHeight)
    .attr("dy","-1")
    .style("fill",function(d,i){
        if (d.freq>thisObject.listOfSentences.length/2){
            return "white";
        }
        else{
            return "black";
        }
    })
    .style("font-size","11px")
    .text(function(d,i){
        return d.freq + "/" + thisObject.listOfSentences.length;
    });
    
    
    
    //animate exiting text
    triggerGroups.exit().select("text")
    .transition()
    .duration(1000)
    .style("font-size",1);
    
    triggerGroups.exit().select("rect")
    .transition()
    .duration(1000)
    .attr("width","1")
    .style("fill","red");
    
    //remove groups
    triggerGroups.exit().attr("class","triggerGroupToRemove").transition().delay(500).remove();
    
    function popoverContent(d,i){

        //compute average confidence
        var avgConfidence = 0;
        thisObject.unique[d.text].forEach(function(elem,ii){
            avgConfidence = avgConfidence + thisObject.arrayOfSentenceObjects[elem.idx].confidence;
        })
        avgConfidence = (1.0*avgConfidence / thisObject.unique[d.text].length).toFixed(2);
        
        //get sentences involved
        var sentencesInvolved = thisObject.unique[d.text].map(function(elem){return elem.idx;});
        
        //get papers involved
        var papersInvolved = [];
        thisObject.arrayOfPaperObjects.forEach(function(elem,idx){
            elem.forEach(function(elem2,idx2){
                //Check if the paper has one of the sentences involved
                if (sentencesInvolved.indexOf(elem2.indexEvidence)>=0){
                    //Check if the paper was found already so that it's not shown repeated
                    if (papersInvolved.indexOf(idx + 1)==-1){
                        papersInvolved.push(idx + 1);
                    }
                }
            })
        });
        var scoreDescription = sentencesInvolved.length + " out of " + thisObject.listOfSentences.length + " sentences use"+(sentencesInvolved.length==1?"s ":" ") + thisObject.participant1 + " &rarr; " + thisObject.listOfTriggers[i].text + " &rarr; " +thisObject.participant2;
        var sentenceEnunciation = sentencesInvolved.length==1?('"<i>' + thisObject.listOfSentences[sentencesInvolved[0]]) +'</i>"' : '<i>Click to view sentences </i>';
        var triggerMetrics = "<b>Average confidence:</b> " + avgConfidence + "<br /><b>Appearing in paper #: </b>"+ papersInvolved.join([separator = ', ']);
        
        return scoreDescription + "<br>" + sentenceEnunciation + "<br>" + triggerMetrics + "<br /><br />Click to adjust event confidence <br/>Shift-click to go to publication";
      }

}

wordTree.prototype.showExpandablePapers = function(eventModelElement){
    //This is when the plain list of sentences are shown
    
    var thisObject = this;
    
    //select working area
    var selection = d3.select("#allPlainSentencesElements");
    
    // get data
    var dataset = this.getData(eventModelElement);

    // compute color scales (this could go to initialization)
    
    //update  text, icon, slidebar, caret
    var selectedSentences = selection.selectAll(".plainPapers")
    .data(thisObject.arrayOfPaperObjects);
    
    selectedSentences.select(".documentImage")
    .on("mousedown",function(d,i){
        //Paper icon clicked
        paperIconClicked(d,i,this,thisObject);
    });
    
    selectedSentences.select(".confidencePaperSlidebar")
    .html(function(d,i){
        return paperProgressBar(d,i);
    });
    
    selectedSentences.select("span")
    .html(function(d,i){
        return setIndividualExpandablePaperResult(d,i,thisObject.textualEvidence[thisObject.currentEventModelElement]['meta']['enriched_evidence'],thisObject);
    });
    
    selectedSentences.select(".expandToShowSentenceIcon")
        .on("mousedown",function(d,i){
            //expandToShowSentenceIcon icon clicked
            expandCollapseToShowSentencesClicked(d,i,this, thisObject);
        });
    
    //edit collapsible div
    selectedSentences.select(".expandableSentencesDiv")
    .attr("class","expandableSentencesDiv collapse-group collapse")    
    .html(function(d,i){
        var auxHTML = "";
        d.forEach(function(dd,ii){
            auxHTML = auxHTML + getColoredSentences(d,ii,thisObject.textualEvidence[thisObject.currentEventModelElement]['meta']['enriched_evidence'],thisObject);
        });
        return auxHTML;
    })
    
    //Insert text, icon, slidebar, caret
    var sentenceToAdd = selectedSentences.enter().append("div")
    .attr("class","plainPapers");
    
    sentenceToAdd.append("svg")
        .attr("width",19)
        .attr("height",15)
        .append("image")
        .attr("class",function(d,i){
            return "documentIcon";// +i;
        })
        .attr("width",15)
        .attr("height",15)
        .attr("x",1)
        .attr("y",1)
        .attr("xlink:href",articleImage)
        .attr("cursor","pointer")
        .attr("title", "Go to PubMed article.")
        .on("mousedown",function(d,i){
            //Paper icon clicked
            paperIconClicked(d,i,this,thisObject);
        });
        
    sentenceToAdd.append("span")
    .attr("class","paperMetaDataClass")
    .html(function(d,i){
        return setIndividualExpandablePaperResult(d,i,thisObject.textualEvidence[thisObject.currentEventModelElement]['meta']['enriched_evidence'],thisObject);
    });
    
    sentenceToAdd.append("div")
    .attr("class", "confidencePaperSlidebar")   
    .attr("data-placement","right")
    .attr("data-trigger","hover")
    .attr("data-toggle","popover")
    .html(function(d,i){
        return paperProgressBar(d,i);
    });
    
    var eventIsEnabled = dataFBL.nodes[dataFBL.mappingModelElementIndex[thisObject.currentEventModelElement]].confidenceEnabled;
    
    if (eventIsEnabled){
        $(selectedSentences.selectAll(".confidencePaperSlidebar")).popover('destroy');
    }
    else{
        $(selectedSentences.selectAll(".confidencePaperSlidebar")).popover({"title":"Event confidence overriden","content":"The adjustment of the paper confidence is disabled as the overall event confidence was modified."});
    }
    
    //This updates old and new caret symbols
    selection.selectAll(".plainPapers").select(".toExpandIcon").append("svg")
        .attr("width",19)
        .attr("height",25)
        .append("image")
        .attr("class",function(d,i){
            return "expandToShowSentenceIcon";
        })
        .attr("width",15)
        .attr("height",15)
        .attr("x",1)
        .attr("y",10)
        .attr("xlink:href",chevronDownImage)
        .attr("cursor","pointer")        
        .on("mousedown",function(d,i){
            //expandToShowSentenceIcon icon clicked
            expandCollapseToShowSentencesClicked(d,i,this, thisObject);
        });
    
    //Add collapsible div
    sentenceToAdd.append("div")
    .attr("class","expandableSentencesDiv collapse-group collapse")
    .style("margin-left","100px")
    .html(function(d,i){
        var auxHTML = "";
        d.forEach(function(dd,ii){
            auxHTML = auxHTML + getColoredSentences(d,ii,thisObject.textualEvidence[thisObject.currentEventModelElement]['meta']['enriched_evidence'],thisObject);
        });
        return auxHTML;
    });
    
    //Add listener for plain paper confidence ranges
    d3.selectAll(".plainPapers").select(".confidencePaperSlidebar").select("input")
    .on("input", function(d,i){
        thisObject.inputIndividualPaperModified(d,i,this);        
    });
    
    //Add listener for change in plain sentence confidence ranges
    d3.selectAll(".plainPapers").select(".expandableSentencesDiv").selectAll("input")
    .on("input", function(d,i){
        d = d3.select(this.parentElement.parentElement.parentElement.parentElement.parentElement).data();
        thisObject.inputIndividualSentenceModified(d[0],i,this);        
    });
        
    //remove selected instances
    selectedSentences.exit().remove();
    
    function paperProgressBar(d,i){
        //Adds  slider with value equal to the average of all sentences
        var avgConf = 0;
        d.forEach(function(elem,idx){
            avgConf = avgConf + elem.confidence * elem.polarity;
        })
        avgConf = avgConf / d.length;
        
        var eventIsEnabled = dataFBL.nodes[dataFBL.mappingModelElementIndex[thisObject.currentEventModelElement]].confidenceEnabled;

        return '<form class="form-horizontal"><div class="form-group"><label for="inputRangeConfidencePlainSentence'+i+'" class="control-label col-xs-4">Paper confidence: <span id="spanAdjustConfidencePlain'+i+'">' + parseFloat(Math.abs(avgConf)).toFixed(2) +'</span><br><span id="spanAdjustPolarityPlainPaper" class="'+ ((avgConf>=0)?("positivePaperClass"):("negativePaperClass")) +'">' + ((parseFloat(avgConf)>=0)?("Positive event"):("Negative event")) + 
        '</span></label><div class="col-xs-7"><input list="ticks" type="range" class="form-control" min ="-1" max="1" step ="0.01" value ="' + avgConf + '"id="inputRangeConfidencePlainPaper'+i+'"' + (eventIsEnabled?'':'disabled ') + '></div><div class="col-xs-1 toExpandIcon"></div>';
    }
    
    function paperIconClicked(d,i,context,thisObject){
        thisObject.openPubmedPublication(d[0].pubmedId);        
    }
    
    function expandCollapseToShowSentencesClicked(d,i,context,thisObject){
        if (d3.select(context).attr("href")==chevronDownImage){
            //Change image
            d3.select(context)
            .attr("xlink:href",chevronUpImage);
        }
        else{
            //Change image
            d3.select(context)
            .attr("xlink:href",chevronDownImage);
        }
        $(d3.select(context.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement).select(".expandableSentencesDiv").node()).collapse("toggle");
    }
    
    function setIndividualExpandablePaperResult(d,i,evidences, thisObject){
        var pubmedId = thisObject.arrayOfPaperObjects[i][0].pubmedId;
        var journalName = thisObject.arrayOfPaperObjects[i][0].journalName;
        var pubDate = thisObject.arrayOfPaperObjects[i][0].pubDate;
        var pubCitations = thisObject.arrayOfPaperObjects[i][0].pubCitations;
        var pubSection = "";
        var articleTitle = thisObject.arrayOfPaperObjects[i][0].articleTitle;
        var articleAltmetricScore = thisObject.arrayOfPaperObjects[i][0].altmetricScore;
        var articleAltmetricPct = thisObject.arrayOfPaperObjects[i][0].altmetricPct;
        var articleImpactFactor = thisObject.arrayOfPaperObjects[i][0].impactFactor;
        
        
        var preamble = "Article " + (i+1);

        var preambleClass = "preambleClass";
        var pubInfoClass = "pubInfoClass";
        var sentenceClass = "sentenceClass";
        var confidenceClass = "confidenceClass";
        var citationClass = "citationClass";
        var altmetricPctClass = "altmetricPctClass";
        var altmetricScoreClass = "altmetricScoreClass";
        var impactFactorClass = "impactFactorClass";
        
        
        
        return '<span class=' + preambleClass + '>'+ preamble + '</span>' + 
               '<span class=' + pubInfoClass  + '> "'+ articleTitle + '" - Published in ' + journalName + ' - ' + pubDate +'</span><br>' + 
               '<span class=' + citationClass + '> Cited by '+ pubCitations + ' articles </span> - ' + 
               '<span class=' + altmetricPctClass +'> Altmetric score: '+ articleAltmetricScore + ' (' + articleAltmetricPct + '%)</span> -' + 
               '<span class='+ impactFactorClass + '> Journal Impact Factor: ' + articleImpactFactor +' </span>';
               
        
    }
    
    function getColoredSentences(d,i,evidences, thisObject){
        //just using the word separator, it may need to add the sentence one
        var myregexp = new RegExp(/([!?,;:.&"-]+|\S*[A-Z]\.|\S*(?:[^!?,;:.\s&-]))/); 
        var listOfWords = d[i].text.split(myregexp);
        sentence = '';
        
        //Need to change this using the spans!----------
        listEntity1 = evidences['enriched_participant_a'].filter(function(elem,idx){
            return elem['evidence_id'] == 'E'+(d[i].indexEvidence);
        }).map(function(elem,idx){
            return evidences.evidence[(d[i].indexEvidence)].evidence_text.slice(elem['begin'],elem['end']);
        });
        
        listEntity2 = evidences['enriched_participant_b'].filter(function(elem,idx){
            return elem['evidence_id'] == 'E'+(d[i].indexEvidence);
        }).map(function(elem,idx){
            //return elem['text'];
            return evidences.evidence[(d[i].indexEvidence)].evidence_text.slice(elem['begin'],elem['end']);
        });
        
        listTrigger = evidences['enriched_trigger'].filter(function(elem,idx){
            return elem['evidence_id'] == 'E'+(d[i].indexEvidence);
        }).map(function(elem,idx){
            //return elem['text'];
            return evidences.evidence[(d[i].indexEvidence)].evidence_text.slice(elem['begin'],elem['end']);
        });
        
        listOfWords.forEach(function(currentWord){
            if (currentWord !=''){
                if ((listEntity1.indexOf(currentWord)>=0)||(listEntity1.indexOf(currentWord.replace(/[^a-zA-Z0-9]+$/, ""))>=0)){
                    sentence = sentence + '<span class="highlightedWordEntity1">'+ currentWord + '</span>';
                }
                else{
                    if ((listEntity2.indexOf(currentWord)>=0)||(listEntity2.indexOf(currentWord.replace(/[^a-zA-Z0-9]+$/, ""))>=0)){
                        sentence = sentence + '<span class="highlightedWordEntity2">'+ currentWord + '</span>';
                    }
                    else{
                        if ((listTrigger.indexOf(currentWord)>=0)||(listTrigger.indexOf(currentWord.replace(/[^a-zA-Z0-9]+$/, ""))>=0)){
                            sentence = sentence + '<span class="highlightedWordTrigger">'+ currentWord + '</span>';
                        }
                        else{
                            sentence = sentence + '<span class="nonHighlightedWord">'+ currentWord + '</span>';
                        }
                    }
                }
            }
        });
        
        
        //---------------------------------------
        
        var sentenceClass = "sentenceClass";
        var confidenceSentenceClass = "confidenceSentenceClass";
        
        var eventIsEnabled = dataFBL.nodes[dataFBL.mappingModelElementIndex[thisObject.currentEventModelElement]].confidenceEnabled;
        
        return '<span class='+ sentenceClass+ '>'+ sentence + '</span><br>' +
                '<div class='+ confidenceSentenceClass+ '>' + 
                   '<form class="form-horizontal">'+ 
                      '<div class="form-group">' + 
                         '<label for="inputRangeConfidencePlainSentence'+i+'" class="control-label col-xs-5">Sentence confidence: '+ 
                            '<span id="spanAdjustConfidencePlainSentence'+i+'">' + parseFloat(d[i].confidence).toFixed(2) +'</span><br><span id="spanAdjustPolarityPlainSentence'+i+'" class="'+ ((parseFloat(d[i].polarity)>=0)?("positiveSentenceClass"):("negativeSentenceClass")) +'">' + ((parseFloat(d[i].polarity)>=0)?("Positive sentence"):("Negative sentence")) + 
                         '</span></label>' + 
                         '<div class="col-xs-7">' + 
                           '<input list="ticks" type="range" class="form-control" min ="-1" max="1" step ="0.01" value ="' + d[i].confidence * d[i].polarity + '"id="inputRangeConfidencePlainSentence'+i+'" ' + (eventIsEnabled?'':'disabled ') +'>'+
                         '</div>' + 
                      '</div></form></div><br>';
    }
}

wordTree.prototype.isContradictory = function(d){
    var thisObject = this;
    var arrayOfPolarityObjects = [];
    if (d.tagName=="Event"){
        if (d.modelElement in thisObject.modifiedEvents){
                arrayOfPolarityObjects = bbb=[].concat.apply([],thisObject.modifiedEvents[d.modelElement].arrayOfPaperObjects).map(function(elem){return elem.polarity;});
         
        }
        else{
            //Used with textualEvidence file that Chryssa prepared
            this.textualEvidence[d.modelElement]['meta']['enriched_evidence']['evidence'].forEach(function(elem,idx){
                
                    arrayOfPolarityObjects.push(elem['negation']?-1:1);

                
            }); 
        }
        var count1 = 0;
        var count2 = 0;
        arrayOfPolarityObjects.forEach(function(elem){
            if (elem>0){
                count1 = count1+1;
            }
            if (elem<0){
                count2 = count2+1;
            }
        });
        return ((count1>0)&&(count2>0));
        
    }
    else{
        return false;
    }
    
     
    
}

/*
wordTree.prototype.showIndividualSentences = function(eventModelElement){
    //This is when the plain list of sentences are shown
    
    var thisObject = this;
    
    //select working area
    var selection = d3.select("#allPlainSentencesElements");
    
    // get data
    var dataset = this.getData(eventModelElement);

    // compute color scales (this could go to initialization)
    
    //Insert / update / remove text
    var selectedSentences = selection.selectAll(".plainSentences")
    //.data(dataset.slice(1))
    .data(thisObject.arrayOfSentenceObjects)
    .html(function(d,i){
        return setIndividualTextResultString(d,i,thisObject.textualEvidence[thisObject.currentEventModelElement]['meta']['enriched_evidence'],thisObject);
    });
        
    selectedSentences.enter().append("div")
    .attr("class","plainSentences")
    .html(function(d,i){
        return setIndividualTextResultString(d,i,thisObject.textualEvidence[thisObject.currentEventModelElement]['meta']['enriched_evidence'],thisObject);
    });
        
    selectedSentences.exit().remove();
    
    //Calling the word tree when a word is clicked and setting mouse pointer
    selection.selectAll(".sentenceClass").selectAll("span")
    .style("cursor","pointer")
    .on("mousedown",function(d,i){
        plainSentenceClicked(d,i,this,thisObject);
    });
    
    
    //Add listener for plain sentence confidence ranges
    d3.selectAll(".plainSentences").selectAll("input")
    .on("input", function(d,i){
        thisObject.inputIndividualSentenceModified(this);        
    });
    
    //this.highlightWordInPlainSentences(thisObject.wordsToHighlight1, thisObject.wordsToHighlight2);
    
    function plainSentenceClicked(d,i,context,thisObject){
        if (d3.event.shiftKey){
            var sentenceElement = d3.select(d3.select(context).node().parentNode.parentNode.parentNode);
            thisObject.openPubmedPublication(sentenceElement.data()[0].pubmedId);
        }
        else{
            clickedText = d3.select(context).html();
        
            if (/\S/.test(clickedText)){
                //It must have something different than space
                showWordTreeTab(clickedText);
            }
        }
    }
    
    
    function setIndividualTextResultString(d,i,evidences, thisObject){
        //just using the word separator, it may need to add the sentence one
        var myregexp = new RegExp(/([!?,;:.&"-]+|\S*[A-Z]\.|\S*(?:[^!?,;:.\s&-]))/); 
        var listOfWords = thisObject.arrayOfSentenceObjects[i].text.split(myregexp);
        sentence = '';
        
        //Need to change this using the spans!----------
        listEntity1 = evidences['enriched_participant_a'].filter(function(elem,idx){
            return elem['evidence_id'] == 'E'+i;
        }).map(function(elem,idx){
            return evidences.evidence[i].evidence_text.slice(elem['begin'],elem['end']);
        });
        
        listEntity2 = evidences['enriched_participant_b'].filter(function(elem,idx){
            return elem['evidence_id'] == 'E'+i;
        }).map(function(elem,idx){
            //return elem['text'];
            return evidences.evidence[i].evidence_text.slice(elem['begin'],elem['end']);
        });
        
        listTrigger = evidences['enriched_trigger'].filter(function(elem,idx){
            return elem['evidence_id'] == 'E'+i;
        }).map(function(elem,idx){
            //return elem['text'];
            return evidences.evidence[i].evidence_text.slice(elem['begin'],elem['end']);
        });
        
        listOfWords.forEach(function(currentWord){
            if (currentWord !=''){
                if (listEntity1.indexOf(currentWord)>=0){
                    sentence = sentence + '<span class="highlightedWordEntity1">'+ currentWord + '</span>';
                }
                else{
                    if (listEntity2.indexOf(currentWord)>=0){
                        sentence = sentence + '<span class="highlightedWordEntity2">'+ currentWord + '</span>';
                    }
                    else{
                        if (listTrigger.indexOf(currentWord)>=0){
                            sentence = sentence + '<span class="highlightedWordTrigger">'+ currentWord + '</span>';
                        }
                        else{
                            sentence = sentence + '<span class="nonHighlightedWord">'+ currentWord + '</span>';
                        }
                    }
                }
            }
        });
        
        
        //---------------------------------------
        
        //var pubmedId = thisObject.PMCID ? thisObject.PMCIDtoPMID[evidences.evidence[i].paper_id.slice(0,-4)]:evidences.evidence[i].paper_id;
        var pubmedId = thisObject.arrayOfSentenceObjects[i].pubmedId;
        var journalName = thisObject.arrayOfSentenceObjects[i].journalName;//thisObject.articleMetaData[pubmedId].fulljournalname;
        var pubDate = thisObject.arrayOfSentenceObjects[i].pubDate;//thisObject.articleMetaData[pubmedId].pubdate;
        var pubCitations = thisObject.arrayOfSentenceObjects[i].pubCitations;//thisObject.articleMetaData[pubmedId].pmcrefcount==""?"0":thisObject.articleMetaData[pubmedId].pmcrefcount;
        var pubSection = "";
        var articleTitle = thisObject.arrayOfSentenceObjects[i].articleTitle;//thisObject.articleMetaData[pubmedId].title;
        
        var preamble = "Sentence #"+i;

        var preambleClass = "preambleClass";
        var pubInfoClass = "pubInfoClass";
        var sentenceClass = "sentenceClass";
        var confidenceClass = "confidenceClass";
        var citationClass = "citationClass";
    
        
        
        return '<span class='+ preambleClass+ '>'+ preamble + '</span>' + '<span class='+ pubInfoClass+ '> from "'+ articleTitle + '". Published in ' + journalName + " - " + pubDate +'</span><br>' + '<span class='+ citationClass +'> Cited by '+ pubCitations+ ' articles<br><span class='+ sentenceClass+ '>'+ sentence + '</span><br>' + '<div class='+ confidenceClass+ '><form class="form-horizontal"><div class="form-group"><label for="inputRangeConfidencePlainSentence'+i+'" class="control-label col-xs-4">Confidence: <span id="spanAdjustConfidencePlain'+i+'">' + parseFloat(d.confidence).toFixed(2) +'</span></label><div class="col-xs-8"><input type="range" class="form-control" min ="0" max="1" step ="0.01" value ="' + d.confidence + '"id="inputRangeConfidencePlainSentence'+i+'"></div></div><br>';
        
        function belongsToList(word,List){
            //Not used
        }
    }
}
*/


window.wordTree = {
        wordTree: wordTree
    };
})(window)
