(function (window, undefined) {

//========================================================================================

var tutorialMode = function(){
    /* Constructor
    */
    this.tutorialStep = 0;        
}

tutorialMode.prototype.initialHint = function(){
    this.initialDialog();
}

tutorialMode.prototype.provideHint = function(){
    var thisObject = this;
    if (this.tutorialStep==0){
        
        this.welcomeDialog();
        
        //this.searchHint();
        this.tutorialStep++;
    }
    else if (this.tutorialStep==1){
        this.removePopover('#searchEntity0');
        this.suggestFusionDialog()
        this.tutorialStep++;
    }
    else if (this.tutorialStep==2){
        this.removePopover('#checkboxFusion');
        this.expandSearchDialog();
        this.tutorialStep++;
    }
    else if (this.tutorialStep==3){
        this.removePopover('#connector0');
        this.constrainSearchDialog();
        this.tutorialStep++;
    }
    else if (this.tutorialStep==4){
        this.removePopover("#searchEvent1");
        this.checkDiscoveryDialog();
        this.tutorialStep++;
    }
    else if (this.tutorialStep==5){
        this.removePopover("#checkboxDiscovery");
        this.showInspectorDialog();
        this.tutorialStep++;
    }
    else if (this.tutorialStep==6){
        this.removePopover(thisObject.specificNode[0]);
        this.showBreakdownDialog();
        this.tutorialStep++;
    }
    else if (this.tutorialStep==7){
        this.removePopover(thisObject.specificBreakdown);
        this.showEvidenceDialog();
        this.tutorialStep++;
    }
    else if (this.tutorialStep==8){
        this.removePopover(thisObject.specificEvidence);
        this.showWordtreeDialog();
        this.tutorialStep++;
    }
    else if (this.tutorialStep==9){
        this.removePopover("#wordTreeNav");
        this.finalDialog();
        this.tutorialStep++;
    }
    else {
        
    }
}

//Messages for dialog
tutorialMode.prototype.initialDialog = function(){
    messageTitle = 'Welcome to LitPathExplorer!'; 
    
    messageBody1 = 'We recommend you to watch this <a href="./LitPathExplorer.mp4" target="_blank">4 minutes video</a> before starting to use LitPathExplorer.';
    
    messageBody2 = 'Alternatively, tick the checkbox below to start LitPathExplorer on <i>tutorial mode</i><br><input id="checkboxTutorial" type="checkbox" onclick="toggleTutorialMode()"> Run on tutorial mode<br><br>For further details, you can check the <a href="./manual/LitPathExplorer User Manual.pdf" target="_blank">manual of the tool<a>'
    
    this.showTutorialDialogHTML(messageTitle,messageBody1, messageBody2, this.checkIfTutorialStarts);
}

tutorialMode.prototype.welcomeDialog = function(){
    messageTitle = 'LitPathExplorer Tutorial'; 
    messageBody1 = 'We will walk you through the interface, so that you can learn how to use the tool.';
    messageBody2 = "Let's start by searching for biomolecular events in a pathway model involving reactions with the Ras protein (first and second order). Searches are quite flexible as we can query for events by their type, by the entities that are part of the event, or by the roles that the entities play in the event."
    
    this.showTutorialDialog(messageTitle,messageBody1, messageBody2, this.searchHint);
}

tutorialMode.prototype.suggestFusionDialog = function(){
    messageTitle = 'Step '+ this.tutorialStep + ' completed'; 
    messageBody1 = 'Well done with your first search! We have now all the reactions in the pathway model containing MEK as one of the entities.';
    messageBody2 = "As the current pathway model seems to be noisy and treats MEK as different proteins, we can try to fuse entities by name."
    
    this.showTutorialDialog(messageTitle,messageBody1, messageBody2, this.fusionHint);
}

tutorialMode.prototype.expandSearchDialog = function(){
    messageTitle = 'Step '+ this.tutorialStep + ' completed'; 
    messageBody1 = 'We now see that there is only node per entity, which makes it easier for analysis despite the noisiness of the model.';
    messageBody2 = "We can build more complex queries by using the + and - icons on the right side of the search panel."
    
    this.showTutorialDialog(messageTitle,messageBody1, messageBody2, this.expandSearchHint);
}

tutorialMode.prototype.constrainSearchDialog = function(){
    messageTitle = 'Step '+ this.tutorialStep + ' completed'; 
    messageBody1 = 'In this way we can combine multiple boolean queries and expand or contrain the search.';
    messageBody2 = "Leaving the AND operator on the top we can add an event name to the search to narrow down the number of events being shown."
    
    this.showTutorialDialog(messageTitle,messageBody1, messageBody2, this.constrainSearchHint);
}

tutorialMode.prototype.checkDiscoveryDialog = function(){
    messageTitle = 'Step '+ this.tutorialStep + ' completed'; 
    messageBody1 = 'We have now the intersection of events that have MEK as entity and Phosphorylation as the event type mentioned in our pathway network.';
    messageBody2 = "An important aspect of the tool is to discover possible extensions based on information text mined from the literature."
    
    this.showTutorialDialog(messageTitle,messageBody1, messageBody2, this.discoveryHint);
}

tutorialMode.prototype.showInspectorDialog = function(){
    messageTitle = 'Step '+ this.tutorialStep + ' completed'; 
    messageBody1 = 'Events that are found in the literature but not yet included in the model are shown with dashed edges. Entities or events yet not in the model are shown in a lighter color.';
    messageBody2 = "We can now inspect all the events and information associated to MEK."
    
    this.showTutorialDialog(messageTitle,messageBody1, messageBody2, this.inspectorHint);
}

tutorialMode.prototype.showBreakdownDialog = function(){
    messageTitle = 'Step '+ this.tutorialStep + ' completed'; 
    messageBody1 = 'The node clicked along with its attributes are shown at the top while information for the neighbour nodes are shown at the bottom.';
    messageBody2 = "An important aspect for users of LitPathExplorer is to be able to understand where the confidence values are computed from."
    
    this.showTutorialDialog(messageTitle,messageBody1, messageBody2, this.breakDownHint);
}

tutorialMode.prototype.showEvidenceDialog = function(){
    messageTitle = 'Step '+ this.tutorialStep + ' completed'; 
    messageBody1 = 'Each of the values below contribute to the computation of confidence (except for "Date".';
    messageBody2 = "LitPathExplorer allows to drill down the evidence found in the literature for further inspection."
    
    this.showTutorialDialog(messageTitle,messageBody1, messageBody2, this.evidenceHint);
}

tutorialMode.prototype.showWordtreeDialog = function(){
    messageTitle = 'Step '+ this.tutorialStep + ' completed'; 
    messageBody1 = 'All the list of papers that mention that particular phosphorylation event can be visualized in this panel. It is also possible to read the specific sentence by expanding each article caret.';
    messageBody2 = "However, reading the sentences one by one could be less useful if the user is interested in comparing how different papers refer to the same event. The Word Tree, therefore, allows visualizing all the sentences at the same time."
    
    this.showTutorialDialog(messageTitle,messageBody1, messageBody2, this.wordtreeHint);
}

tutorialMode.prototype.finalDialog = function(){
    messageTitle = 'Step '+ this.tutorialStep + ' completed'; 
    messageBody1 = 'This interactive visualization allows you to inspect and contrast all the sentences with respect to a specific word (typically an entity or a trigger word).';
    messageBody2 = 'This was just a quick tutorial on LitPathExplorer! There are many other features available that you explore. You can also watch the <a href="./LitPathExplorer.mp4" target="_blank">4 minutes video</a> to see more. Thanks!'
    
    this.showTutorialDialogHTML(messageTitle,messageBody1, messageBody2, null);
}
//------------------------------------------------------------------------------

//Showing popovers

tutorialMode.prototype.searchHint = function(){
    $("#searchEntity0").popover({content:"Search for an entity such as MEK", delay: { "show": 1000, "hide": 100 },container:"body", title: "Search", placement: "top", trigger:"manual"});
    
    $("#searchEntity0").popover('show');
}


tutorialMode.prototype.fusionHint = function(){
    $("#checkboxFusion").popover({content:"Tick to enable fusion by name", delay: { "show": 1000, "hide": 100 },container:"body", title: "Fusion", placement: "top", trigger:"manual"});
    
    $("#checkboxFusion").popover('show');
}

tutorialMode.prototype.expandSearchHint = function(){
    $("#connector0").popover({content:"Click the green plus sign to expand the search query", delay: { "show": 1000, "hide": 100 },container: "body", title: "Expand search", placement: "top", trigger:"manual"});
    
    $("#connector0").popover('show');
}

tutorialMode.prototype.constrainSearchHint = function(){
    $("#searchEvent1").popover({content:"Search for an event such as Phosphorylation", delay: { "show": 1000, "hide": 100 },container:"body", title: "Search", placement: "right", trigger:"manual"});
    
    $("#searchEvent1").popover('show');
    //This is because of potential racing conditions. FIx!!!!!!!
    //tutorialObj.removePopover('#connector0');
}

tutorialMode.prototype.discoveryHint = function(){
    $("#checkboxDiscovery").popover({content:"Tick to discover potential extensions to the model", delay: { "show": 1000, "hide": 100 },container:"body", title: "Discovery mode", placement: "top", trigger:"manual"});
    
    $("#checkboxDiscovery").popover('show');
}

tutorialMode.prototype.inspectorHint = function(){
    //find specific node
    tutorialObj.specificNode = d3.selectAll(".node").filter(function(elem){return elem.normalisedName=='MEK';});
    
    $(tutorialObj.specificNode[0]).popover({content:"Click on MEK to inspect its attributes", delay: { "show": 1000, "hide": 100 },container:"body", title: "Inspect node", placement: "top", trigger:"manual"});
    
    $(tutorialObj.specificNode[0]).popover('show');
}

tutorialMode.prototype.breakDownHint = function(){
    //find specific node
    tutorialObj.specificBreakdown = d3.selectAll(".breakDownButton")[0][2]
    
    $(tutorialObj.specificBreakdown).popover({content:"Click the caret to display the breakdown of the confidence", delay: { "show": 1000, "hide": 100 },container:"body", title: "Confidence breakdown", placement: "top", trigger:"manual"});
    
    $(tutorialObj.specificBreakdown).popover('show');
}

tutorialMode.prototype.evidenceHint = function(){
    //find specific node
    tutorialObj.specificEvidence = d3.selectAll(".inspectTextButton")[0][2]
    
    $(tutorialObj.specificEvidence).popover({content:"Click the document icon to inspect the evidence found in the literature", delay: { "show": 1000, "hide": 100 },container:"body", title: "Text evidence", placement: "top", trigger:"manual"});
    
    $(tutorialObj.specificEvidence).popover('show');
}

tutorialMode.prototype.wordtreeHint = function(){
    //find specific node
    
    
    $("#wordTreeNav").popover({content:"Click here to compare sentences visually", delay: { "show": 1000, "hide": 100 },container:"body", title: "Word Tree", placement: "right", "trigger":"manual"});
    
    $("#wordTreeNav").popover('show');
}

//-------------------------------------------------------------------------------

//Common methods
tutorialMode.prototype.checkIfTutorialStarts = function(){
    if (tutorialEnabled){        
        tutorialObj.provideHint();
    }
}

tutorialMode.prototype.removePopover = function(selector){
    $(selector).popover('hide');
}

tutorialMode.prototype.showTutorialDialog = function(messageTitle,messageBody1,messageBody2, functionsForNext){
    
    d3.select("#tutorialModeDialog").select(".modal-title")
    .text(messageTitle);
    
    d3.select("#tutorialModeDialog").select(".modal-body").select(".part1")
    .text(messageBody1);
    
    d3.select("#tutorialModeDialog").select(".modal-body").select(".part2")
    .text(messageBody2);
    
    d3.select("#tutorialModeDialog").select("button")
    .on("click",function(){
        functionsForNext();
    })
    
    $("#tutorialModeDialog").modal('show');
}

tutorialMode.prototype.showTutorialDialogHTML = function(messageTitle,messageBody1,messageBody2, functionsForNext){
    
    d3.select("#WelcomeModeDialog").select(".modal-title")
    .html(messageTitle);
    
    d3.select("#WelcomeModeDialog").select(".modal-body").select(".part1")
    .html(messageBody1);
    
    d3.select("#WelcomeModeDialog").select(".modal-body").select(".part2")
    .html(messageBody2);
    
    d3.select("#WelcomeModeDialog").select("button")
    .on("click",function(){
        if (functionsForNext != null){
            functionsForNext();
        }
        
    })
    
    $("#WelcomeModeDialog").modal('show');
}

window.tutorialMode = {
        tutorialMode: tutorialMode
    };
})(window)
