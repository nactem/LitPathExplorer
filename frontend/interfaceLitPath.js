var maxSuggestedNumberOfNodes = 500;
var maxAbsoluteNumberOfNodes = 1500;
var initialQueries = 1;
var networkStarted = false;
var confidence = {"min":0, "max":1};

var sessionId = +new Date();
var loggingURL = ''

var variableGlobal =true;

var xmlMoleculePath  = './icons/molecule (1).svg';
//var xmlMoleculePath  = './icons/simpleEntity2.svg';
//var xmlMoleculePath  = './icons/moleculeD3.svg';//it doesn't work

var xmlGearPath  = './icons/gears.svg';
//var xmlGearPath  = './icons/simpleEvent2.svg';

var xmlGearNegPath  = './icons/gears_Neg3.svg';
//var xmlGearPath  = './icons/eventD3.svg';//it doesn't work

var chevronDownImage = './SVG/si-glyph-arrow-down.svg';
var chevronUpImage = './SVG/si-glyph-arrow-up.svg';
var inspectTextImage = './SVG/si-glyph-document-copy.svg';
var modifyEventImage = './SVG/si-glyph-spanner.svg';
var articleImage = './SVG/si-glyph-document-bullet-list.svg';

var PMCID = true; //Whether pubmedcentral is being used as id for documents

var scriptExportNetwork = GLOBALscriptExportNetwork;

var whiteListOfNames = [];
var blackListOfNames = [];

var tutorialEnabled = false;

var currentNumberOfNodes = 0;

//This is the time when it first connects and saved as cookie
var userId;
var datasetId;////to distiguish use for the cookies

//Used to identify different types of IDs, and then use this to link to the appropriate onthology
var regExPanther = /PANTHER PATHWAY COMPONENT:(\w+)/;
var regExUniProt = /UniProt:(\w+)/;
var regExChEBI = /ChEBI:(\w+)/;
var regExMESH = /MESH 2013:(\w+)/;
var regExCAS = /CAS:(\w+)/;
var regExNCBI = /NCBI:(\w+)/;

//This will have the array of overriden events in the user's history
var usersOverridenEvents;

function interfaces(){

	//autocomplete([Ras-2-neighborhood_synonyms.xmi]);
	
	/*dataToSend={'filepath':'./cgi-bin/Ras-2-neighborhood_synonyms.xmi'};
    //Call parserBiopack
	jQuerySendData(dataToSend,urlString);*/
    
    //var randNumb = Math.floor(Math.random() * 1000);
	
	var modelFile = './data/outputFull.json';//12Kbreast cancer - Ras Big Mech
	//var modelFile = './data/outputFullReactome.json';//12K breast cancer - reactome
    
    
    var textualEvidenceFile = './data/out.full.cc.direct110417.json';//12Kbreast cancer - Ras Big Mech
    //var textualEvidenceFile = './data/out.full.cc.reactome28072017.json';//12Kbreast cancer - Ras Reactome
    //var textualEvidenceFile = './data/out.full.cc.directMelanoma220217.json';//Melanoma - Ras Big Mech
    //var textualEvidenceFile = './data/out.full.cc.directUnion080817.json';//Melanoma+BreastCancer - Ras Big Mech
    //var textualEvidenceFile = './data/out.full.cc.directUnionNew080817.json';//Melanoma+BreastCancer - Ras Big Mech (New)
    
    var PMCIDtoPMIDfile = './data/meta-data/pubmedCentralMapping110417.json';//12Kbreast cancer - Ras Big Mech
    //var PMCIDtoPMIDfile = './data/meta-data/pubmedCentralMappingReactome28072017.json';//12Kbreast cancer - Ras Reactome
    //var PMCIDtoPMIDfile = './data/meta-data/pubmedCentralMappingMelanoma220217.json';//Melanoma - Ras Big Mech
    //var PMCIDtoPMIDfile = './data/meta-data/pubmedCentralMappingUnion070817.json';//Melanoma+BreastCancer - Ras Big Mech
    //var PMCIDtoPMIDfile = './data/meta-data/pubmedCentralMappingUnionNew070817.json';//Melanoma+BreastCancer - Ras Big Mech (New)
    
    var articleMetaDataFile = './data/meta-data/articleMetaData110417.json';//12Kbreast cancer - Ras Big Mech
    //var articleMetaDataFile = './data/meta-data/articleMetaDataReactome28072017.json';//12Kbreast cancer - Reactome
    //var articleMetaDataFile = './data/meta-data/articleMetaDataMelanoma220217.json';//Melanoma - Ras Big Mech
    //var articleMetaDataFile = './data/meta-data/articleMetaDataUnion070817.json';//Melanoma + 12Kbreast cancer - Reactome
    //var articleMetaDataFile = './data/meta-data/articleMetaDataUnionNew070817.json';//Melanoma + 12Kbreast cancer - Reactome (New)
    
    var scriptReadEventOverriddenURL = GLOBALscriptReadEventOverriddenURL;
    
    var filesToLoad = 5;
	var modelData,textData,xmlGear,xmlMolecule,PMCIDtoPMID, articleMetaData;
	
	//Reading json file
	d3.json(modelFile, function(error,datasetModel) {
        d3.xml(xmlMoleculePath).mimeType("image/svg+xml").get(function(error, xmlMoleculeData) {
            d3.xml(xmlGearPath).mimeType("image/svg+xml").get(function(error, xmlGearData) {
                d3.xml(xmlGearNegPath).mimeType("image/svg+xml").get(function(error, xmlGearNegData) {
                    modelData = datasetModel;
                    xmlMolecule = xmlMoleculeData;
                    xmlGear = xmlGearData;
                    xmlGearNeg = xmlGearNegData;
                    filesCoordinator();
                })
            })
        })
    });
    
    d3.json(textualEvidenceFile, function(error,datasetModel) {
            textData = datasetModel;
            filesCoordinator();
    });
    
    d3.json(PMCIDtoPMIDfile, function(error,datasetModel) {
            PMCIDtoPMID = datasetModel;
            filesCoordinator();
    });
    
    d3.json(articleMetaDataFile, function(error,datasetModel) {
            articleMetaData = datasetModel;
            filesCoordinator();
    });
    
    //Read user's past overriden events (as per cookie user-id)
    jQueryAJAX({"userId": userId}, scriptReadEventOverriddenURL, eventOverriddenRead);
	
    function eventOverriddenRead(response){
        usersOverridenEvents = response.overriddenEvents.slice(0);
        filesCoordinator();
    }
	
    //Activate listeners
    listenerSearch();
    listenerSearchNode();
    listenerWordTrees();
    listenerCheckboxes();
    listenerSettings();
    listenerNavsTextAnalyzer();
    layoutOptions();
    listenerTriggerVisualization();
    
    function filesCoordinator(){
        filesToLoad--;
        if (filesToLoad==0){
            allFilesLoaded()
        }
    }
    
    function allFilesLoaded(){
        var patternToFind = /prot=(\w+)/;
        
        /*        
        //Find what specific visual metaphor will be used
        if (patternToFind.test(window.location.href)){
            prot = patternToFind.exec(window.location.href)[1];
            if (prot=='force'){
                forceBasedRepresentation();                
            }
        }
        else{
            alert("Input not recognized");
        }*/
        forceBasedRepresentation();
        
        //Stop wait indicator
        d3.select("#indicatorGIF").remove()
        //d3.select("#waitIndicator").style("visibility","hidden");
        
        tutorialObj.initialHint();
        
    }
    
    function forceBasedRepresentation(){
        //tutorial object
        tutorialObj = new tutorialMode.tutorialMode();
        
        //evidence Aggregator
        eventAgg = new aggregateEvidence.evidenceAggregator();
        
        //Create data for graph
        dataFBL = new dataForForceBased.dataForForceBased(modelData,textData,PMCIDtoPMID, articleMetaData, usersOverridenEvents);
        
        //Populate autocompletes
        autoCompleteSearches(dataFBL,0);
        //Filter data
        
        //Initialize wordTree
        wt = new wordTree.wordTree('#wordTree','#textAnalyzerFieldset',textData, dataFBL, PMCIDtoPMID, articleMetaData);
        
        //Create node info object
        nodeInfo = new nodeInfoDisplay.nodeInfo("#clickedNode", "#neighborNodes","#inspectorFieldset",dataFBL,wt);

        //Visualize graph
        ntwrk = new network.networkVis(d3.select("#mainChart"),dataFBL.getNodes(),dataFBL.getWeights(),dataFBL.getNodeRange(),dataFBL.getWeightRange(),dataFBL,nodeInfo,xmlMolecule,xmlGear,xmlGearNeg);
        
        
        //enable search controls
        enableSearchElements();
    }
}

function enableSearchElements(){
    $('#searchEvent0').removeAttr('disabled');
    $('#searchEntity0').removeAttr('disabled');
    $('#searchRole0').removeAttr('disabled');
    
    d3.select(".glyphicon-plus")
    .on("click", plusSignPressed);
    
    d3.select(".glyphicon-minus")
    .on("click", minusSignPressed);
}

function listenerNavsTextAnalyzer(){
    //While this could be done automatically, the word tree cannot be properly generated if the area is not visible at the time of rendering
    $('#wordTreeNav').on("shown.bs.tab",function(){
        var focusedWord = dataFBL.evidence[nodeInfo.nodeClicked.modelElement].meta.enriched_evidence.evidence[0].evidence_text.slice(dataFBL.evidence[nodeInfo.nodeClicked.modelElement].meta.enriched_evidence.enriched_participant_a[0].begin,dataFBL.evidence[nodeInfo.nodeClicked.modelElement].meta.enriched_evidence.enriched_participant_a[0].end); //Get the word with the proper casing
        showWordTreeTab(focusedWord);
    });
    
    $('#plainSentencesNav').on("shown.bs.tab",function(){
        showPlainSentenceTab(nodeInfo.nodeClicked.modelElement);
    });
    
    $('#SOVNav').on("shown.bs.tab",function(){
        showTriggerVisualization(nodeInfo.nodeClicked.modelElement);
    });
}

function showTriggerVisualization(modelElement){
    wt.showTriggerVisualization(modelElement);
}

function showWordTreeTab(focusWord){
    //set word in input box
    d3.select("#searchWordTree")[0][0].value = focusWord;
    
    //Activate the proper tab manually
    //$("#wordTreeNav").tab('show')
    $("#allWordTreeElements").addClass("in active");
    $("#allPlainSentencesElements").removeClass("in");
    $("#allPlainSentencesElements").removeClass("active");
    $("#allSOVElements").removeClass("in");
    $("#allSOVElements").removeClass("active");
    wt.addWordTree(focusWord,'suffix', nodeInfo.nodeClicked.modelElement);
    
    //Highlight the current tab
    $(d3.select("#plainSentencesNav").node().parentElement).removeClass("active");    
    $(d3.select("#SOVNav").node().parentElement).removeClass("active");    
    $(d3.select("#wordTreeNav").node().parentElement).addClass("active");
    
}

function showPlainSentenceTab(modelElement){
    //Activate the tab manually
    $("#plainSentencesNav").tab('show')
    
    /*$("#allPlainSentencesElements").addClass("in active");    
    $("#allWordTreeElements").removeClass("in");
    $("#allWordTreeElements").removeClass("active");*/
    
    //wt.showIndividualSentences(modelElement);
    wt.showExpandablePapers(modelElement);
}


function listenerCheckboxes(){
    $('#checkboxShowLabels').on("change",function(){
            ntwrk.toggleNodeLabels(this.checked);
    });
    $('#checkboxDiscovery').on("change",function(){
            visualizeGraphAfterConfidenceFiltering();
            //visualizeGraph();
            if (tutorialEnabled && (tutorialObj.tutorialStep==5)){
                tutorialObj.provideHint();
            }
    });
    
    $('#checkboxPolarity').on("change",function(){
            visualizeGraphAfterPolarityFiltering();
            //visualizeGraph();
    });
    
    $('#checkboxFusion').on("change",function(){
            //visualizeGraphAfterPolarityFiltering();
            visualizeGraphAfterFusion();
            //visualizeGraph();
            if (tutorialEnabled && (tutorialObj.tutorialStep==2)){
                tutorialObj.provideHint();
            }
    });
    
}
function listenerWordTrees(){
    $('input[name=wordTreeTypeRadios]').click(function(){
        console.log(this.value)
        wt.changedOrder(this.value);
    });
    $('#searchWordTree').on("change",function(){
            wt.addWordTree(this.value,$('input[name=wordTreeTypeRadios]:checked').val());
    });
    
    
}

function listenerTriggerVisualization(){
    $('#selPart1').on("change",function(){
        wt.participantsOrLemmaChanged();
    });
    
    $('#triggerVisCheckbox').on("change",function(){
        wt.participantsOrLemmaChanged();
    });
    
    
}

function listenerSearch(){
    
	d3.selectAll("input[type=search]").on("change", searchChanged);
    d3.select("#allQueries").selectAll("select").on("change", searchChanged);
}

function listenerSearchNode(){
     d3.selectAll("#searchNode").on("change", searchNodeChanged);
}

function listenerSettings(){
     d3.selectAll("#btnSettings").on("click", function(){
        $("#confidenceComputationModal").modal('show');
     });
     
     //Add listener for ranges
    /*d3.select("#confidenceComputationModal").selectAll("input")
    .on("input", function(d,i){
        d3.select(".spanSlider"+i)
        .html(this.value)
    });*/
    
    d3.select("#exportGraphButton")
    .on("click", function(d,i){
        exportCurrentGraph();
    });
    
    d3.select("#btnSaveSettings")
    .on("click", function(d,i){
        blackListOfNames = d3.select("#blackListTextArea").node().value==""?[]:d3.select("#blackListTextArea").node().value.split("\n");
        whiteListOfNames = d3.select("#whiteListTextArea").node().value==""?[]:d3.select("#whiteListTextArea").node().value.split("\n");
        visualizeGraphAfterWBListing();
    });
    
    //checkbox for contradictory events  in settings
    $('#checkboxContradictory').on("change",function(){
        if (this.checked){
            ntwrk.identifyContradictoryNodes();
        }
        else{
            ntwrk.removeContradictoryNodes();
        }
            
    });
    //Checkbox for using the neural network
    $('#checkboxNNmode').on("change",function(){
        //extract all event nodes. This could have been taken from dataFBL to increased efficiency!!!!!

        var eventNodes = dataFBL.nodes.filter(function(elem){return elem.tagName=='Event';});
        
        if (this.checked){
            //Change mode
            dataFBL.NNmode = true;
            //recompute nodes using the INITIAL neural network            
            eventAgg.serverSideComputeAggregatedValues(eventNodes, eventAgg.NEURAL_NETWORK);
            
            //set message NN weights are under recomputation
            d3.select("#networkRegenerated").style("visibility","visible");
            
            //The update of the graph has to be done when it gets the asynchronous response from the server. That's why it's not done here
        }
        else{
            dataFBL.NNmode = false;
            //set message NN weights are under recomputation
            d3.select("#networkRegenerated").style("visibility","visible");
            
            eventNodes.forEach(function(elem){
                if (elem.confidenceEnabled){
                    elem.value = eventAgg.computeAggregatedValue(elem, eventAgg.SIMPLE_AVERAGE);
                }
            });
            //Update graph (some events may have changed polarity)
            if (currentNumberOfNodes>0){
                visualizeGraphAfterPolarityFiltering();
            }
            
            
            //recomputation finished
            d3.select("#networkRegenerated").style("visibility","hidden");
        }
        
    });
}


function searchNodeChanged(d){
    //Search for the id of a node and zoom-in
    var re = /.+?\((.+)\)/;
    var val = d3.selectAll("#searchNode")[0][0].value;
    if (re.test(val)){
        extractedId = re.exec(val)[1];
        dataFBL.nodeZoom(extractedId,ntwrk);
    }
}
function searchChanged(d){

    //Make the network viewer visible (at least the first time this is done)
    d3.select("#networkViewerTd")
    .style("display","inherit");
    
    //A new query was entered
    var query = getQueryFromAllInputs();
    
    //Filter data appropriately
    dataFBL.filterEventRoleEntity(query.events, query.roles, query.entities, query.booleans);
    
    //tutorial breakpoint
    if (tutorialEnabled && (((tutorialObj.tutorialStep==1)&&(query.entities[0]=="MEK"))||((tutorialObj.tutorialStep==4)&&(query.events[1]=="Phosphorylation")))){
        tutorialObj.provideHint();
    }
    
    visualizeGraph();
}  
function visualizeGraph(){
    //Make model fieldset visible
    d3.select("#networkViewer").style("visibility","visible");
    
    //Filter data according to confidence
    dataFBL.filterLinkConfidence($( "#slider-range" ).slider( "values", 0 )/100, $( "#slider-range" ).slider( "values", 1 )/100);
    
    visualizeGraphAfterConfidenceFiltering();    
}

function visualizeGraphAfterConfidenceFiltering(){
    //This function is called after the confidence filtering has been applied. This allows just filtering events only occurring in text when the discovery checkbox is applied without retouching the filtering by confidence
    //BUT in order to this to work, we need to use different variable names for the outputs of filterLinkConfidence and filterBasedOnTextEvidence as otherwise clicking again the same button does not get the necessary old data from filterLinkConfidence back. 
    
    
    //Only show events that are part of the model when discovery is off
    dataFBL.filterBasedOnTextEvidence(d3.select("#checkboxDiscovery")[0][0].checked);
    
    visualizeGraphAfterPolarityFiltering();
}

function visualizeGraphAfterPolarityFiltering(){
    
    dataFBL.filterBasedOnPolarity(d3.select("#checkboxPolarity")[0][0].checked);
    visualizeGraphAfterWBListing();
}
function visualizeGraphAfterWBListing(){
    dataFBL.filterBasedOnWhiteBlackList(whiteListOfNames,blackListOfNames);
    visualizeGraphAfterFusion();
}

function visualizeGraphAfterFusion(){
    dataFBL.filterBasedOnFusion(d3.select("#checkboxFusion")[0][0].checked,"normalisedName");
    
    //show contradictory nodes
    if ($("#checkboxContradictory").is(":checked")){
        ntwrk.identifyContradictoryNodes();
    }
    //get number of filtered nodes
    currentNumberOfNodes = dataFBL.getReducedNodes2().length;
    
    d3.select("#nodeCounterLabel")
    .text(currentNumberOfNodes + " entities and events found")
    
    //update results label
    if (currentNumberOfNodes>maxSuggestedNumberOfNodes){
        makeShowButton("visible");
        ntwrk.coverGraph();
        changeNodeCounterColor("red");
    }
    else{
        showGraph();        
    }
    
    populateNodeSearchBox();
}


function populateNodeSearchBox(){
    //populate search box for nodes in the graph
    var reducedNames = dataFBL.getReducedNodes2().map(function(elem){
        if (!(elem.tagName=='Event')){
            return elem.normalisedName + " (" + elem.id+")";
        }
        else{
            return "";
        }
    })
    autocomplete(reducedNames,"#searchNode", searchNodeChanged)
}
function changeNodeCounterColor(colorName){
    d3.select("#nodeCounterLabel")
    .style("color",colorName);
}
    
function makeShowButton(property){
    d3.select("#showButton")
    .style("visibility",property);

}

function getQueryFromAllInputs(){
    queries = {"events":[],'entities':[],'roles':[], 'booleans':[]};
    d3.range(initialQueries).forEach(function(index){
        queries.events.push(d3.selectAll("#searchEvent"+index)[0][0].value);
        queries.entities.push(d3.selectAll("#searchEntity"+index)[0][0].value);
        queries.roles.push(d3.selectAll("#searchRole"+index)[0][0].value);
        queries.booleans.push(d3.selectAll("#searchBoolean"+index)[0][0].value=="AND");
    })
    return queries;
}

function showGraph(){
    //Remove warnings
    makeShowButton("hidden");
    ntwrk.removeCover();
    changeNodeCounterColor("blue");
    
    ntwrk.updateVis(dataFBL.getReducedNodes2(),dataFBL.getReducedWeights2());
    /*
    if (!networkStarted) {
        ntwrk = new network.networkVis(d3.select("#mainChart"),dataFBL.getReducedNodes(), dataFBL.getReducedWeights(),dataFBL.getNodeRange(), dataFBL.getWeightRange());
        networkStarted = true;
    }
    else{
        ntwrk.updateVis(dataFBL.getReducedNodes(),dataFBL.getReducedWeights());
    }*/
}



function doubleSlide(){
//Setting properties for the range slider
    $(function() {
        $( "#slider-range" ).slider({
          range: true,
          min: 0,
          max: 100,
          values: [ 0, 100 ],
          stop: function( event, ui ) {
              //console.log(event)
              confidenceSliderStopped(ui);           
          },
          slide: function( event, ui ) {
              //console.log(event)
              confidenceSliderMoved(ui);           
          }
        });
        $( "#amount" ).val( $( "#slider-range" ).slider( "values", 0 )/100 +
          " - " + $( "#slider-range" ).slider( "values", 1 )/100 );
      });
}

function confidenceSliderMoved(ui){
    confidence.min = ui.values[ 0 ]/100;
    confidence.max = ui.values[ 1 ]/100;
    $( "#amount" ).val( confidence.min + " - " + confidence.max);
    //dataFBL.filterLinkConfidence(confidence.min, confidence.max);
    //ntwrk.updateVis(dataFBL.getReducedNodes(),dataFBL.getReducedWeights());
}
function confidenceSliderStopped(ui){
    confidence.min = ui.values[ 0 ]/100;
    confidence.max = ui.values[ 1 ]/100;
    
    visualizeGraph();
    /*
    dataFBL.filterLinkConfidence(confidence.min, confidence.max);
    ntwrk.updateVis(dataFBL.getReducedNodes2(),dataFBL.getReducedWeights2());
    
    populateNodeSearchBox();
    */
}

function plusSignPressed(){
    if (tutorialEnabled && (tutorialObj.tutorialStep==3)){
        tutorialObj.provideHint();
    }
    initialQueries++;    
    modifyQueryInput();
    autoCompleteSearches(dataFBL,initialQueries-1);
    //New listeners need to be defined
    listenerSearch();
    
}

function minusSignPressed(){
    if (initialQueries>1){
        initialQueries--;
        modifyQueryInput();
        searchChanged(null);
    }
}

function modifyQueryInput(){
    
    var queryInstances = d3.select("#allQueries").selectAll(".expandableSearch").data(d3.range(initialQueries));
    
    queryInstances.enter().append("span")
    .attr("id", function(d,i){return "search"+i})
    .attr("class","expandableSearch")
    .style("display","inline-block")
    .style("margin-right","10px")
    .html('<select name="booleans" id="searchBoolean'+ (initialQueries-1 )+'" class="form-control input-sm" style="width:35%;"><option value="AND" selected="">AND</option><option value="OR">OR</option></select> <input style="font-size:11pt;width:254px;display:block" type="search" id="searchEvent'+ (initialQueries-1 )+'" cols="100px" class="form-control" placeholder="Event"> <form class="form-inline"><input style="font-size:11pt;width:125px;" type="search" id="searchEntity'+ (initialQueries-1 )+'" cols="40px" class="form-control" placeholder="Entity"> <input style="font-size:11pt;width:125px" type="search" id="searchRole'+ (initialQueries-1 )+'" cols="40px" class="form-control" placeholder="Role"></form>');
    
    queryInstances.exit().remove();
    
}

function autocomplete(availableTags,selection, triggerOnChange){
    $(selection).autocomplete({
      source: availableTags,
      close: triggerOnChange
    });
}

function autoCompleteSearches(dataObject,indexQuery){
    var eventListNames = Object.keys(dataObject.mappingEventNameIndex);
    var entityListNames = Object.keys(dataObject.mappingEntityNameIndex);
    var roleListNames = Object.keys(dataObject.mappingLinkRoleIndex);
    autocomplete(eventListNames,"#searchEvent"+indexQuery,searchChanged);
    autocomplete(entityListNames,"#searchEntity"+indexQuery,searchChanged);
    autocomplete(roleListNames,"#searchRole"+indexQuery,searchChanged);
    
}

function layoutChanged(){
    layout = d3.selectAll("#layoutSelect")[0][0].value;
    if (layout=="Unconstrained"){
        ntwrk.updateVis(dataFBL.getReducedNodes2(),dataFBL.getReducedWeights2());
    }
    else if (layout=="Sorted Diagonal"){
        ntwrk.confidenceAlignedDiagonalLayout(dataFBL.getReducedNodes2())
    }
    else if (layout=="Sorted Circle"){
        ntwrk.confidenceAlignedCircularLayout(dataFBL.getReducedNodes2())
    }
    else if (layout=="Circle"){
        ntwrk.layoutCircles(100,dataFBL.getReducedNodes2())
    }
    else if (layout=="Midband"){
        ntwrk.layoutMiddleBand(50,dataFBL.getReducedNodes2())
    }
    else if (layout=="Bipartite"){
        ntwrk.layoutBipartite(50,dataFBL.getReducedNodes2())
    }
    
}

function layoutOptions(){
    options = ["Unconstrained","Sorted Diagonal", "Sorted Circle", "Circle","Midband","Bipartite"];
    
    d3.select("#layoutSelect").selectAll("options").data(options)    
    .enter().append("option")
    .attr("value",function (d){return d;})
    .html(function (d){return d;});
    
    d3.selectAll("#layoutSelect").on("change", layoutChanged);
}

function exportCurrentGraph(){
    var csv = []
    dataFBL.reducedNodes2.forEach(function(elem,idx){
        var row = [];
        if (elem.tagName=="Event"){
            row.push(elem);
            elem.reducedConnected.forEach(function(modElem,idx2){
                row.push(dataFBL.nodes[dataFBL.mappingIndexName[modElem]]);
            })
            csv.push(row);
        }
    });
    
    jQueryAJAX(csv,scriptExportNetwork, exportedNetworkSaved);
}

function jQueryAJAX(dataToSend,urlString,successCallBack){
    $.ajax({
        url: urlString,
        data: JSON.stringify(dataToSend),
        type: 'POST',
        contentType: "application/json; charset=utf-8",
        success: successCallBack,
        error: function(request,error){
            alert("Request: " + JSON.stringify(request) + "eror :" + error);
        }
    });
}
function exportedNetworkSaved(data){
     console.log(data.result);
     d3.select("#graphExportedSpan").attr("href",pathSavedNetworks+data.result).text(data.result);
}

function scrollScreenVertically(position){
    //Used to scroll the screen at the beginning and when a tree is visualized
    $('html,body').animate({scrollTop: position}, 1000);
}

function addToolTips(){
    d3.select("#checkboxPolarityLabel")
    .attr("title","When Negatives is on, the graph highlights events that were found in the literature to be not likely to happen.\u000AThey are shown with a red X overlaid on the event node.");
    
    d3.select("#checkboxDiscoveryLabel")
    .attr("title","When Discovery is on, candidate events found in scientific literature but not in the model are also shown in the Network Viewer.\u000AThese nodes are shown with a lighter color and links with a dashed line.");
    
    d3.select("#checkboxFusionLabel")
    .attr("title","When Fusion is on, entities that have same names but different IDs are shown as a single node.\u000AThis aims at avoid showing potential noise coming from the model.");
    
    d3.select("#confidenceFilteringGroup")
    .attr("title","Filter events in the graph based on calculated confidence.");
    
    d3.select("#whiteListTextArea")
    .attr("title","When not empty, the Network viewer will only show entities included here.\u000AEntities should be listed one by line.");
    
    d3.select("#blackListTextArea")
    .attr("title","The Network viewer will not show any entities included here.\u000AEntities should be listed one by line");
    
    
}

function checkBrowser(){
    var browser = {};
    // Opera 8.0+ (UA detection to detect Blink/v8-powered Opera)
    browser.isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
    // Firefox 1.0+
    browser.isFirefox = typeof InstallTrigger !== 'undefined';
    // Safari 3.0+
    browser.isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0 || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || safari.pushNotification);
    // Internet Explorer 6-11
    browser.isIE = /*@cc_on!@*/false || !!document.documentMode;
    // Edge 20+
    browser.isEdge = !browser.isIE && !!window.StyleMedia;
    // Chrome 1+
    browser.isChrome = !!window.chrome && !!window.chrome.webstore;
    // Blink engine detection
    isBlink = (browser.isChrome || browser.isOpera) && !!window.CSS;
    
    return browser;
    
}

function warningBasedOnBrowser(browser){
    if (browser.isIE){
        alert('LitPathExplorer is not supporting Internet Explorer at the moment. We strongly suggest using Chrome (recommended), Firefox or Opera.');
    }
    /*if (browser.isFirefox){
        alert('LitPathExplorer has been only tested in Chrome. We strongly recommend using an updated version of Chrome.');
    }
    if (browser.isOpera){
        alert('LitPathExplorer has been only tested in Chrome. We strongly recommend using an updated version of Chrome.');
    }*/
    if (browser.isSafari){
        alert('LitPathExplorer is not supporting Safari at the moment. We strongly suggest using Chrome (recommended), Firefox or Opera.');
    }
}

function toggleTutorialMode(){
    tutorialEnabled = !tutorialEnabled;
}

function getCookie(){
    userId = readCookie("LitPathExplorer"+datasetId)
    if (userId==null){
        var date = new Date();        
        createCookie("LitPathExplorer"+datasetId,date.getTime(),365);
    }
    
}

//adjustTables();
var browser = checkBrowser();
getCookie();
warningBasedOnBrowser(browser);

scrollScreenVertically(0);
interfaces();
doubleSlide();
addToolTips();



/*


function adjustTables(){

    //Adjust element sizes according to screen resolution
    var verticalBottomSpace = 160;
    var horizontalRightSpace = 80;
    var searchResultsWidth = $(window).width()/2;
    var searchResultsHeight = $(window).height() - 140;
    
    d3.select("#searchResults")
    .attr("width", searchResultsWidth)
    .attr("height", searchResultsHeight);
    
    d3.select("#retrievedResults")
    .style("height", ($(window).height() - verticalBottomSpace)+"px")
    .style("overflow","auto");
    
    d3.select("#contextColumn").append("svg")
    .style("width",50)
    .style("height",$(window).height() - verticalBottomSpace);
    
    d3.select("#stats")
    .style("width","300px;");
    
    d3.select("#mainChart").style("height", ($(window).height() - 100) + 'px');
    
    mayInterestMargins = {top:35,right:20,bottom:10,left:10};
    mayInterestWidth = $(window).width() - searchResultsWidth - horizontalRightSpace; 
    mayInterestHeight = $(window).height() - 200;
    
      
    d3.select("#queryImage")
    .style("left",(searchResultsWidth + mayInterestMargins.left)+'px');
  
}

*/