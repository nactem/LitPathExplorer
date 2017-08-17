(function (window, undefined) {

//========================================================================================

var evidenceAggregator = function(){
    /* Constructor
    */
    this.SIMPLE_AVERAGE = 0;
    this.WEIGHTED_AVERAGE = 1;
    this.NEURAL_NETWORK = 2;
    this.scriptRunNN = GLOBALscriptRunNN;
    this.scriptRetrainNN = GLOBALscriptRetrainNN;
    
    //Currently duplicated from nodeInfoDisplay. Ideally they should be only here
    
    this.scaleCitations = d3.scale.linear().domain([0,20]).range([0,1]).clamp(true);
    this.scalePapers = d3.scale.linear().domain([0,10]).range([0,1]).clamp(true);
    this.scaleImpactFactor = d3.scale.linear().domain([0,10]).range([0,1]).clamp(true);
    this.saturateYearOld = 20;
    //this.scaleRecency = d3.scale.linear().domain([Date.parse('1996 01 01'),Date.now()]).range([1,0]).clamp(true);
    var currentDate = new Date(Date.now());
    var saturationDate= new Date(Date.now());
    saturationDate.setFullYear(saturationDate.getFullYear() - this.saturateYearOld);
    this.scaleRecency = d3.scale.linear().domain([Date.parse(saturationDate),Date.parse(currentDate)]).range([1,0]).clamp(true);
}

evidenceAggregator.prototype.computeAggregatedValue = function(nodeObject,mode){
    //This should also check either here or before whether  node.confidenceEnabled is true or false!!!!!!!!!!
    
    var values = [nodeObject.altmetricPct/100, this.scaleImpactFactor(nodeObject.impactFactor), nodeObject.languageCertainty, this.scaleCitations(nodeObject.nCitations),this.scalePapers(nodeObject.nPapers), this.scaleRecency(nodeObject.recency)];
    
    if (mode == this.SIMPLE_AVERAGE){
        var sum = 0;
        values.forEach(function(elem){
            sum = sum + elem;
        });
        
        return sum / values.length * nodeObject.polarity;
    }
    else if (mode == this.WEIGHTED_AVERAGE){
        var weights = [1,1,1,1,1,1];
        var normWeights
        weights.forEach(function(w,idx,allElem){
            normWeights.push(w*(1/allElem.length));
        });
        var sum = 0;
        values.forEach(function(elem,idx){
            sum = sum + elem*normWeights[idx];
        });
        return sum / values.length * nodeObject.polarity;

    }
    else if (mode == this.NEURAL_NETWORK){
        //This mode does not quite work as it requires too many calls to the server
        //jQueryAJAX({"": normalizedTriples, "path": path}, './cgi-bin/saveTriples.py', exportedTriple);
        
    }
}

evidenceAggregator.prototype.serverSideComputeAggregatedValues = function(eventNodes, mode){
    
    if (mode == this.NEURAL_NETWORK){
        var normalizedAttributes = [];
        eventNodes.forEach(function(elem,idx){
            elem2 = jQuery.extend(true, {}, elem)
            
            elem2.impactFactor = isNaN(elem.impactFactor)? 0 : eventAgg.scaleImpactFactor(elem.impactFactor);
            elem2.nCitations = isNaN(elem.nCitations)? 0 : eventAgg.scaleCitations(elem.nCitations);
            elem2.nPapers = isNaN(elem.nPapers)? 0 : eventAgg.scalePapers(elem.nPapers);
            elem2.recency = isNaN(elem.recency)? 0 : eventAgg.scaleRecency(elem.recency);
            elem2.altmetricPct = isNaN(elem.altmetricPct)? 0 : elem.altmetricPct/100;
            
            normalizedAttributes.push(elem2)
        });
        
        
        jQueryAJAX({"eventNodes": normalizedAttributes, "userId": userId }, this.scriptRunNN, computedNN);
    }
    
    function computedNN(results){
        eventNodes.forEach(function(elem,idx){
            if (elem.confidenceEnabled){
                elem.value = results.values[idx][0] * elem.polarity;
            }
        }) ;
        //recomputation finished
        d3.select("#networkRegenerated").style("visibility","hidden");
    }
}

evidenceAggregator.prototype.retrainNN = function(orderedEventNodes,nLabeledEvents){
    //orderedEventNodes should be ordered by having first those that are not labeled (hence they use the initial average) and then by those overriden
    
    
    var normalizedAttributes = [];
    orderedEventNodes.forEach(function(elem,idx){
        elem2 = jQuery.extend(true, {}, elem)
        
        elem2.impactFactor = isNaN(elem.impactFactor)? 0 : eventAgg.scaleImpactFactor(elem.impactFactor);
        elem2.nCitations = isNaN(elem.nCitations)? 0 : eventAgg.scaleCitations(elem.nCitations);
        elem2.nPapers = isNaN(elem.nPapers)? 0 : eventAgg.scalePapers(elem.nPapers);
        elem2.recency = isNaN(elem.recency)? 0 : eventAgg.scaleRecency(elem.recency);
        elem2.altmetricPct = isNaN(elem.altmetricPct)? 0 : elem.altmetricPct/100;
        
        normalizedAttributes.push(elem2)
    });
        
        
    jQueryAJAX({"eventNodes": normalizedAttributes, "nLabeledEvents": nLabeledEvents, "userId": userId }, this.scriptRetrainNN, retrainedNN);
    
    
    function retrainedNN(results){
        orderedEventNodes.forEach(function(elem,idx){
            if (elem.confidenceEnabled){
                elem.value = results.values[idx][0] * elem.polarity;
            }
        });
        //Update graph (some events may have changed polarity)
        if (currentNumberOfNodes>0){
            visualizeGraphAfterPolarityFiltering();
        }
        
        //recomputation finished
        d3.select("#networkRegenerated").style("visibility","hidden");

    }
}

window.aggregateEvidence = {
        evidenceAggregator: evidenceAggregator
    };
})(window)
