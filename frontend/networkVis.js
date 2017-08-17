(function (window, undefined) {

	var networkVis = function(svgSelection,nodes,weights,rangeNodes,rangeWeights,dataObj, nodeObj, xmlEntity,xmlEvent,xmlEventNeg){
		var thisObject = this;
		var thisVisObject = this;
		var width = 600,
		height = 600;
		
		var scaleDist = d3.scale.linear()
					.domain(rangeWeights)
					.range([80,60]);
					
		var scaleEdgeThickness = d3.scale.linear()
					.domain(rangeWeights)
					.range([0.5,5]);
					
        //using d3 svg objects
		/*var scaleSize = d3.scale.linear()
					.domain(rangeNodes)
					.range([8,80]).clamp(true);
          */          
                    
                    
        var scaleSize = d3.scale.linear()
					.domain(rangeNodes)
					.range([0.05,0.13]).clamp(true);
                    
        var scaleTransparency = d3.scale.linear()
					.domain(rangeNodes)
					.range([0.4,1]).clamp(true);
                    
        
                               
					
            var colorScale = d3.scale.category20();
            var colorScaleFix = d3.range(20).map(function(elem){
                return colorScale(elem);
            }).filter(function(elem,idx){
               return !(idx%2); 
            });
            
            function color(i){
                return colorScaleFix[i];
            }
            
            var scaleSpacing = d3.scale.linear().domain(rangeWeights).range([20, 0]);
            
            var force = d3.layout.force()
            .charge(-600)
            //.theta(0.4)
            .linkStrength(0.3)
            //.linkDistance(300)
            .size([width, height])
            //.nodes(nodes.slice(0,2))
            .nodes(nodes)
            //.links(weights.slice(0,1))
            .links(weights)
            .friction(0.9)
            .linkDistance(function(link, index){
                return scaleDist(link.value);
            });
            
            this.nodeLabelsOn = $("#checkboxShowLabels")[0].checked;
            
            
            var svg = svgSelection.append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .call(d3.behavior.zoom().scaleExtent([0.5, 8]).on("zoom", zoom))//geometric zoom        
            .append("g");
            
            svg.append("rect")
            .attr("class", "overlay")
            .attr("width", width)
            .attr("height", height);
            
            svgSelection.select("svg").append("text")
            .attr("id","zoomLabel")
            .attr("y","15")
            .attr("x",width-50)
            .style("text-anchor","end")
            .style("fill","brown")
            .text("")

            function zoom() {
                svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                d3.select("#zoomLabel")
                .text(((d3.event.scale>0.99)&&(d3.event.scale<1.01))?"":d3.event.scale.toFixed(2) + "x zoom");
            }
            

            var link = svg.append("g").attr("class","all_links").selectAll(".link")
                        .data(weights.slice(0,1), function(d,i){
                            return nodes[d.source].id + nodes[d.target].id;})
                        .enter().append("line")
                        .attr("class", "link")
                        .style("stroke-width", function(d) { 
                            return scaleEdgeThickness(Math.abs(d.value)); 
                        })
                        .append("title")
                        .text(function(d) { return 'Value: ' +  parseFloat(d.value).toFixed(3) + '\u000dRole: ' + d.role;});
            drag = force.drag()
                    .on("dragstart",thisObject.dragInit)
                    .on("dragend", thisObject.dragFinish);
            
            //Visualizing two nodes only to make rendering quicker
            var node = svg.append("g").attr("class","all_nodes").selectAll(".node")
                        .data(nodes.slice(0,2),function(d,i){return d.id;})
                        /*.enter().append("circle")
                        .attr("class", "node")
                        .attr("r", function(d,i){
                            return scaleSize(d.value);
                        })
                        .style("stroke","white")*/
                        .enter().append("g")
                        .attr("class", "node")
                        .attr("transform",function(d){
                            return "translate(" + d.x + "," + d.y + ")";
                        })
                        .call(drag);
                        
                        /*
                        //This uses different symbol types as nodes
                        node.append("path")
                        .attr("class","nodePlain")
                        .attr("d", d3.svg.symbol()
                            .size(function(d,i){
                                return scaleSize(d.value);
                            })
                            .type(function(d,i){
                                return d3.svg.symbolTypes[d.tagName=='Event'?0:1];
                            })
                        ) */
                        /* the problem of this one is that the DOM cannot be accessed
                        //This uses different symbol types as nodes
                        node.append("image")
                        .attr("class","nodePlain")
                        .attr("width",80)
                        .attr("height",80)
                        .attr("xlink:href", function(d,i){
                            return "./icons/molecule (3).svg";
                        })
                        */                        
                        
                        
                        
                        node.append("g")
                        .attr("class","nodePlain")
                        .attr("transform",function(d,i){
                            return "translate("+ (0- 463*scaleSize(Math.abs(d.value))*0.5)+","+(0- 463*scaleSize(Math.abs(d.value))*.5)+") scale("+scaleSize(Math.abs(d.value))+")";
                        })
                        .html(function(d,i){
                            return d.tagName=='Event'?(d.polarity<0?d3.select(xmlEventNeg.documentElement).select("g").html():d3.select(xmlEvent.documentElement).select("g").html()):d3.select(xmlEntity.documentElement).select("g").html(); 
                        })
                        //.style("stroke","white")
                        .style("fill", function(d,i) { 
                            return color(d.tagName=="Event" ? dataObj.typeEventArray.indexOf(d.normalisedName)+1:0);
                        })
                        .style("opacity",function(d){
                            return d.inModel?1:0.4;
                        })
                        .on("mousedown",function (d,i){
                            thisVisObject.downNode(d,d3.event,this)})
                        .on("mouseover", function(d,i){
                            thisVisObject.hoverOverNode(d,this,thisVisObject)})
                        .on("mouseout",function(d,i){
                            thisVisObject.hoverOverNodeEnd(d)});
                        
                        node.append("text")
                        .text(function(d){return d.normalisedName;})
                        .style("visibility",thisObject.nodeLabelsOn?"visible":"hidden")
                        .attr("dx","10")
                        .attr("dy","0");


            node.append("title")
                .text(function(d) { return d.tagName + ': ' + d.normalisedName + ' (' + d.id +')' + (((d.tagName!='Event')&&(d.hasOwnProperty("reducedConnected"))&&(d.reducedConnected.length!=d.connected.length))?'\u000d(Shift+click to see other associated events)':'');});
            
            //var drag = force.drag().on("dragend",dragFinish);
            
            d3.select(".all_nodes").append("defs")
                        .html('<defs><radialGradient id="RadialGradient1"><stop offset="0%" stop-color="transparent" stop-opacity="0"></stop><stop offset="90%" stop-color="yellow" style="stop-opacity: 0.2; "></stop><stop offset="100%" stop-color="yellow" style="stop-opacity: 0.9;"></stop></radialGradient></defs>');
                        
            force.on("tick", function(e) {
                            thisObject.svg.selectAll(".node")
                            .each(thisObject.collide(1.5 * e.alpha, nodes.slice(0,2)))
                            .attr("transform", function(d) {
                                d.x = d3.max([d3.min([d.x,width-20]),20]);
                                d.y = d3.max([d3.min([d.y,height-20]),20]);
                                return "translate(" + d.x + "," + d.y + ")"; });
                                
                            thisObject.svg.selectAll(".link")
                            .attr("x1", function(d) { return d.source.x; })
                                .attr("y1", function(d) { return d.source.y; })
                                .attr("x2", function(d) { return d.target.x; })
                                .attr("y2", function(d) { return d.target.y; });
                                
                            /*link2.attr("d", function(d) {
                                var dx = nodes[d.target].x - nodes[d.source].x,
                                    dy = nodes[d.target].y - nodes[d.source].y,
                                    dr = Math.sqrt(dx * dx + dy * dy);
                                
                                return "M" + 
                                    nodes[d.source].x + "," + 
                                    nodes[d.source].y + "A" + 
                                    dr + "," + dr + " 0 0,1 " + 
                                    nodes[d.target].x + "," + 
                                    nodes[d.target].y;
                            });*/
                    });
            
            this.svg = svg;
            this.svgSelection = svgSelection;
            this.force = force;
            this.scaleDist =scaleDist;
            this.scaleEdgeThickness =scaleEdgeThickness;
            this.color =color;
            this.scaleSize = scaleSize;
            this.scaleSpacing = scaleSpacing;
            this.drag = drag;
            this.width = width;
            this.height = height;        
            this.dataObj = dataObj;
            this.nodeObj = nodeObj;
            this.xmlEntity = xmlEntity;
            this.xmlEvent = xmlEvent;
            this.xmlEventNeg = xmlEventNeg;
            
            force.start();
            for (var i = 0; i < 0; ++i) force.tick();
            force.stop();
            
            weights.forEach(function(elem){
                elem.value = elem.source.value;//Math.random();            
            })

	}
    
    networkVis.prototype.identifyContradictoryNodes = function(){
        //dirty way  so that we don't have multiple circles
        d3.selectAll(".contradictoryCircle")
        .remove();
        
        d3.select(".all_nodes").selectAll(".node")
        .filter(function(d,i){
            if (wt.isContradictory(d)){
                return true;
            }
            else{
                return false;
            }
        })
        .insert("circle",":first-child")
        .attr("class","contradictoryCircle")
        .attr("cx",0)
        .attr("cy",0)
        .attr("r",30)
        .style("fill","url(#RadialGradient1)");
    }
    
    networkVis.prototype.removeContradictoryNodes = function(){
        d3.selectAll(".contradictoryCircle")
        .remove();
    }
    
    networkVis.prototype.coverGraph = function(){
        var thisObject = this;
        
        var rectSelection = this.svgSelection.select("svg").selectAll(".coverRectangle").data([1]);
        
        rectSelection.enter().append("rect")
        .attr("class","coverRectangle")
        .attr("x",0)
        .attr("y",0)
        .attr("width",thisObject.width)
        .attr("height",thisObject.height)
        .style("fill-opacity",0.75)
        .style("fill","grey");
    }
    
    networkVis.prototype.removeCover = function(){
        var thisObject = this;
        
        this.svgSelection
        .select(".coverRectangle")
        .remove();
    }
    
    
	networkVis.prototype.downNode = function(d,e,context){
	//function topicClicked(d,e){
    
		if (e.shiftKey){
            this.dataObj.expandNode(d.id);
            visualizeGraph();
            //this.updateVis(this.dataObj.getReducedNodes(),this.dataObj.getReducedWeights());
            /*
			if (nodeClicked[d.index]){
				//unstrokeNode(d.index);
				nClickedNodes = nClickedNodes - 1;
				nodeClicked[d.index] = false;
				unhighlightTableRow(d.index);
			}
			else{
				//strokeNode(d.index);
				nClickedNodes = nClickedNodes + 1;
				nodeClicked[d.index] = true;
				highlightTableRow(d.index);
			}
			thisObject.filterEdges(currentThreshold);
			//dehighlightNeighbors(d,this);
            */
		}
        if (e.ctrlKey){
            //this.dataObj.collapseNode(d.id);
            //visualizeGraph();
        }
        else{
            this.nodeObj.addNodeInfo(d, this);
        }

	}
    
    networkVis.prototype.hoverOverNode = function(d,context,thisObject){
        this.setClassNode(d,"nodeHovered");
		highlightNeighbors(d,context,thisObject);
	}
    
    networkVis.prototype.setClassNode = function (d, className){
        /* 
        //Used when standard svg objects are used
        this.svg.selectAll(".node")        
        .data([d], function(d){return d.id;})
        .selectAll("path")
        .attr("class",className);
        */
        
        //This is when an external file is used as a node in the graph. this is for choosing the group that have path as a child
        var nodePath = this.svg.selectAll(".node").data([d], function(d){return d.id;}).select("path").node();
        var nodePathParent = nodePath == null? null :  nodePath.parentNode;
        d3.select(nodePathParent)
        .attr("class",className);
        
    }
	
	function highlightNeighbors(d,context,thisObject){
	//function highlightNeighbors(d,context){
		currentNeighbors = [];
		currentNeighbors = findNeighbors(d,thisObject.dataObj.mappingIndexName,thisObject.dataObj.nodes);
		
		/*
        //Used when standard svg objects are used
        selectedNeighbors = thisObject.svg.selectAll(".node")
        .data(currentNeighbors, function(d){return d.id;})
        //.data(currentNeighbors, function(dd){return dd.id;})//This doesn't work
        .selectAll("path")
        .attr("class","nodeNeighbor");
        */
        
        /*
        //This is when an external file is used as node. this is for choosing the group that have path as a child
        selectedNeighbors = d3.selectAll(thisObject.svg.selectAll(".node")
        .data(currentNeighbors, function(d){return d.id;})
        //.data(currentNeighbors, function(dd){return dd.id;})//This doesn't work
        .select("path").node().parentNode)
        .attr("class","nodeNeighbor");
		*/
        
        //Used when standard svg objects are used
        selectedNeighbors = thisObject.svg.selectAll(".node")
        .data(currentNeighbors, function(d){
            return d.id;})
        //.data(currentNeighbors, function(dd){return dd.id;})//This doesn't work
        .selectAll("g")
        .attr("class","nodeNeighbor");
		
		function findNeighbors(d,mapping,nodes){
            var neighs = [];
            d.reducedConnected.forEach(function(Id){
                neighs.push(nodes[mapping[Id]]);
            });
			return(neighs);            
            /*return d.reducedConnected;*/
		}
	}
    
    networkVis.prototype.hoverOverNodeEnd = function(d){
        this.setClassNode(d,"nodePlain");
		dehighlightNeighbors(d,this);
	}
    
    //this.dehighlightNeighbors = function (d,context){
	function dehighlightNeighbors(d,context){
		
		selectedNeighbors
        .attr("class","nodePlain");
		
        /*.style("stroke","white")
		.style("fill",function(d,i){
			if (d3.select("#chkboxColor")[0][0].checked){
				return color(dictionaryTopic[topic_type[d.index][0]]);
			}
			else{
				return color(0);
			}
		})*/
	}
    
    networkVis.prototype.dragInit = function (d) {
			d3.event.sourceEvent.stopPropagation();
			//d3.select(this).classed("fixed", d.fixed = true);
		}
    
    networkVis.prototype.dragFinish = function(d){
        if (d3.event.sourceEvent.altKey){
            d.fixed = false;
        }
        else{
            d.fixed = true;
        }
    }
    
    networkVis.prototype.toggleNodeLabels = function(value){
        this.nodeLabelsOn = value;
        var thisObject = this;
        this.svg.selectAll(".node").selectAll("text")
        .style("visibility",thisObject.nodeLabelsOn?"visible":"hidden");
    }
    
    
    
    networkVis.prototype.zoomOnAndOff = function(p0,p1){
        var thisObject = this;
        var center = [thisObject.width / 2, thisObject.height / 2];
        if (p0.length==0){
            p0 = center;
            p0.push(thisObject.width);
        }
        
              
        this.svg.call(transition,p0,p1);
        var thisObject = this;
        
        function transition(svg, start, end) {
          var center = [thisObject.width / 2, thisObject.height / 2],
              i = d3.interpolateZoom(start, end);

          svg
              .attr("transform", transform(start))
            .transition()
              .delay(250)
              .duration(i.duration * 2)
              .attrTween("transform", function() { return function(t) { return transform(i(t)); }; })
              .each("end", function() { d3.select(this).call(transitionFinish, end, start); });
        }
        
        function transitionFinish(svg, start, end) {
            var i = d3.interpolateZoom(start, end);

          svg
              .attr("transform", transform(start))
            .transition()
              .delay(250)
              .duration(i.duration * 2)
              .attrTween("transform", function() { return function(t) { return transform(i(t)); }; });
              //.each("end", function() { d3.select(this).call(transitionFinish, end, start); });
        }
        function transform(p) {
            var k = thisObject.height / p[2];
            return "translate(" + (center[0] - p[0] * k) + "," + (center[1] - p[1] * k) + ")scale(" + k + ")";
          }
    }
    
    networkVis.prototype.updateVis = function(reducedNodes, reducedWeights){
        var thisObject = this;
        var thisVisObject = this;
        
            
            var linkToModify = thisObject.svg.select(".all_links").selectAll(".link")
                        .data(reducedWeights, function(d,i){
                            return d.source.id + d.target.id;})
                        .style("stroke-width", function(d) { 
                            return thisObject.scaleEdgeThickness(Math.abs(d.value)); 
                        });
            linkToModify.select("title")
                        .text(function(d) { return 'Value: ' +  parseFloat(d.value).toFixed(3) + '\u000dRole: ' + d.role;});
                        
                        
            linkToModify.enter().append("line")
                        .attr("class", "link")
                        .style("stroke-width", function(d) { 
                            return thisObject.scaleEdgeThickness(Math.abs(d.value)); 
                        })
                        .style("stroke-dasharray",function(d){
                            //return "10 " + thisObject.scaleSpacing(d.value);
                            return d.source.inModel?"none":"10, 5";
                        })
                        .append("title")
                        .text(function(d) { return 'Value: ' +  parseFloat(d.value).toFixed(3) + '\u000dRole: ' + d.role;});
                        
            linkToModify.exit().remove();
                        
            var nodeToModify = thisObject.svg.select(".all_nodes").selectAll(".node")
                        .data(reducedNodes,function(d,i){return d.id;});
            
            nodeToModify.select("title")
                        .text(function(d) { return d.tagName + (d.inModel?"":" (not present in the model) ")+': ' + d.normalisedName + ' (' + d.id +')' + (((d.tagName!='Event')&&(d.hasOwnProperty("reducedConnected"))&&(d.reducedConnected.length!=d.connected.length))?'\u000d(Shift+click to see other associated events)':'');});
                        /*.style("stroke","white")
                        .style("fill", function(d,i) { 
                            return thisObject.color(0);
                        });*/
                        
            nodeToModify.select("g")                        
                        .attr("transform",function(d,i){
                            return "translate("+ (0- 463*thisObject.scaleSize(Math.abs(d.value))*0.5)+","+(0- 463*thisObject.scaleSize(Math.abs(d.value))*.5)+") scale("+thisObject.scaleSize(Math.abs(d.value))+")";
                        })
                        .html(function(d,i){
                            return d.tagName=='Event'?(d.polarity<0?d3.select(thisObject.xmlEventNeg.documentElement).select("g").html():d3.select(thisObject.xmlEvent.documentElement).select("g").html()):d3.select(thisObject.xmlEntity.documentElement).select("g").html();                             
                        });
                        
            var nodeAdded = nodeToModify.enter()
                        /*.append("circle")
                        .attr("class", "node")
                        .style("stroke","white")*/
                        .append("g")
                        .attr("class", "node")
                        .attr("transform",function(d){
                            return "translate(" + d.x + "," + d.y + ")";
                            //return "translate(" + d.x?d.x:0 + "," + d.y?d.y:0 + ")";
                        })
                        .call(drag);
                        
                        /*
                        //This uses different symbol types as nodes
                        nodeAdded.append("path")
                        .attr("class","nodePlain")
                        .attr("d", d3.svg.symbol()
                            .size(function(d,i){
                                return scaleSize(d.value);
                            })
                            .type(function(d,i){
                                return d3.svg.symbolTypes[d.tagName=='Event'?0:1];
                            })
                        )*/
                        /*
                        // the problem of this one is that the DOM cannot be accessed
                        
                        nodeAdded.append("image")
                        .attr("class","nodePlain")
                        .attr("width",80)
                        .attr("height",80)
                        .attr("xlink:href", "./icons/flask.svg")
                        //.attr("type", "image/svg+xml")
                        */
                        
                        nodeAdded.append("g")
                        .attr("class","nodePlain")
                        .attr("transform",function(d,i){
                            return "translate("+ (0- 463*thisObject.scaleSize(Math.abs(d.value))*0.5)+","+(0- 463*thisObject.scaleSize(Math.abs(d.value))*.5)+") scale("+thisObject.scaleSize(Math.abs(d.value))+")";
                        })
                        .html(function(d,i){
                            return d.tagName=='Event'?(d.polarity<0?d3.select(thisObject.xmlEventNeg.documentElement).select("g").html():d3.select(thisObject.xmlEvent.documentElement).select("g").html()):d3.select(thisObject.xmlEntity.documentElement).select("g").html();                             
                        })
                        /*.style("stroke","white")*/
                        .style("fill", function(d,i) { 
                            return thisObject.color(d.tagName=="Event" ? thisObject.dataObj.typeEventArray.indexOf(d.normalisedName)+1:0);
                        })
                        .style("opacity",function(d){
                            return d.inModel?1:0.4;
                        })                        
                        .on("mousedown",function (d,i){
                            thisVisObject.downNode(d,d3.event,this)})
                        .on("mouseover", function(d,i){
                            thisVisObject.hoverOverNode(d,this,thisVisObject)})
                        .on("mouseout",function(d,i){
                            thisVisObject.hoverOverNodeEnd(d)});
                        
                        nodeAdded.append("title")
                        .text(function(d) { return d.tagName + (d.inModel?"":" (not present in the model) ") + ': ' + d.normalisedName + ' (' + d.id +')' + (((d.tagName!='Event')&&(d.hasOwnProperty("reducedConnected"))&&(d.reducedConnected.length!=d.connected.length))?'\u000d(Shift+click to see other associated events)':'');});
                        
                        nodeAdded.append("text")
                        .text(function(d){return d.normalisedName;})
                        .style("visibility",thisObject.nodeLabelsOn?"visible":"hidden")
                        .attr("dx","10")
                        .attr("dy","0");
                        
            nodeToModify.exit().remove();
            
            thisObject.force.nodes(reducedNodes)
            .links(reducedWeights);
            
                    
            thisObject.force.start();
        
    }
    networkVis.prototype.changeClassToNode = function(nodeFound,newClass){
        //I think that this function could be replaced by setClassName (BTW, I am not sure if it is used)
        
        /*
        this.svg.selectAll(".node").data([nodeFound],function(d){return d.id;})
        .selectAll("path").attr("class",newClass);
        */
        
        d3.selectAll(this.svg.selectAll(".node").data([nodeFound], function(d){return d.id;}).select("path").node().parentNode)
        .attr("class",newClass);
        
    }
    
    networkVis.prototype.showConfidenceDashArray = function(){
        thisObject = this;
        this.svg.selectAll(".link")
        .style("stroke-dasharray",function(d){
            //return "10 " + thisObject.scaleSpacing(d.value);
            return "10, 5";;
        });
    }
    
    networkVis.prototype.layoutCircles = function(radious,reducedNodes){
        thisObject = this;
        /*this.force
        .linkStrength(1)
        .gravity(0.1);*/
        
        reducedNodes.forEach(function(node,i){
            if (node.hasOwnProperty("layoutFixed") && node.layoutFixed){
                node.fixed = false;
                node.layoutFixed = false
            }
        });
        
        this.force.on("tick", function(e) {
                        var kx = 1.2 * e.alpha, ky = 1.2 * e.alpha;
						thisObject.svg.selectAll(".node")
                        .each(thisObject.collide(0.5 * e.alpha, reducedNodes))
                        .each(thisObject.layoutNodeCircle(1.2 * e.alpha, thisObject,radious))
                        .attr("transform", function(d) {                            
							d.x = d3.max([d3.min([d.x,thisObject.width-20]),20]);
							d.y = d3.max([d3.min([d.y,thisObject.height-20]),20]);
							return "translate(" + d.x + "," + d.y + ")"; 
                        });
							
						thisObject.svg.selectAll(".link")
                        .attr("x1", function(d) { return d.source.x; })
							.attr("y1", function(d) { return d.source.y; })
							.attr("x2", function(d) { return d.target.x; })
							.attr("y2", function(d) { return d.target.y; });
							
						/*link2.attr("d", function(d) {
							var dx = nodes[d.target].x - nodes[d.source].x,
								dy = nodes[d.target].y - nodes[d.source].y,
								dr = Math.sqrt(dx * dx + dy * dy);
							
							return "M" + 
								nodes[d.source].x + "," + 
								nodes[d.source].y + "A" + 
								dr + "," + dr + " 0 0,1 " + 
								nodes[d.target].x + "," + 
								nodes[d.target].y;
						});*/
                        
				});
        this.force.start();        
    }
    networkVis.prototype.layoutNodeCircle = function(kxy, thisObject,radious){
        return function(d){
            if (!(d.tagName=="Event")){
                if (thisObject.inViolationCircle(d, radious, thisObject.width, thisObject.height)){
                //if (true){
                    d.x += -(thisObject.width/2 - d.x) * kxy;
                    d.y += -(thisObject.height/2 - d.y) * kxy;
                }
            }
            else{
                if (!thisObject.inViolationCircle(d, radious, thisObject.width, thisObject.height)){
                //if (true){
                    d.x += (thisObject.width/2 - d.x) * kxy;
                    d.y += (thisObject.height/2 - d.y) * kxy;
                }
            }
        }
    }
    
    networkVis.prototype.inViolationCircle = function(d, radious, w , h){
        if ((Math.pow(radious,2) - Math.pow(d.y - h/2, 2)) < 0){
            return false;
        }
        else{
            var circEq = Math.sqrt(Math.pow(radious,2) - Math.pow(d.y - h/2,2)) + w/2;
            if (Math.abs(circEq - w/2) > Math.abs(d.x - w/2)){
                return true;
            }
            else{
                return false;
            }
        }
    }
    
    networkVis.prototype.layoutMiddleBand = function(distanceCenter, reducedNodes){
        var thisObject = this;
        /*this.force
        .linkStrength(1)
        .gravity(0.1);*/
        
        reducedNodes.forEach(function(node,i){
            if (node.hasOwnProperty("layoutFixed") && node.layoutFixed){
                node.fixed = false;
                node.layoutFixed = false
            }
        });
        
        this.force.on("tick", function(e) {
                        var kx = 1.2 * e.alpha, ky = 1.2 * e.alpha;
						thisObject.svg.selectAll(".node")
                        .each(thisObject.layoutNodeMidBand(1.2 * e.alpha, thisObject, distanceCenter))
                        .each(thisObject.collide(10.5 * e.alpha, reducedNodes))
                        .attr("transform", function(d) {                            
							d.x = d3.max([d3.min([d.x,thisObject.width-20]),20]);
							d.y = d3.max([d3.min([d.y,thisObject.height-20]),20]);
							return "translate(" + d.x + "," + d.y + ")"; 
                        });
							
						thisObject.svg.selectAll(".link")
                        .attr("x1", function(d) { return d.source.x; })
							.attr("y1", function(d) { return d.source.y; })
							.attr("x2", function(d) { return d.target.x; })
							.attr("y2", function(d) { return d.target.y; });
							
						/*link2.attr("d", function(d) {
							var dx = nodes[d.target].x - nodes[d.source].x,
								dy = nodes[d.target].y - nodes[d.source].y,
								dr = Math.sqrt(dx * dx + dy * dy);
							
							return "M" + 
								nodes[d.source].x + "," + 
								nodes[d.source].y + "A" + 
								dr + "," + dr + " 0 0,1 " + 
								nodes[d.target].x + "," + 
								nodes[d.target].y;
						});*/
                        
				});
        this.force.start();        
    }
    
    networkVis.prototype.layoutNodeMidBand = function(kxy, thisObject, distanceCenter){
        return function(d){
            if (!(d.tagName=="Event")){
                if (thisObject.inViolationMidBand(d, distanceCenter, thisObject.width)){
                //if (true){
                    d.x += -(thisObject.width/2 - d.x) * kxy;
                    //d.y += -(thisObject.height/2 - d.y) * kxy;
                }
            }
            else{
                if (!thisObject.inViolationMidBand(d, distanceCenter, thisObject.width)){
                //if (true){
                    d.x += (thisObject.width/2 - d.x) * kxy;
                    //d.y += (thisObject.height/2 - d.y) * kxy;
                }
            }
        }
    }
    
    networkVis.prototype.inViolationMidBand = function(d, distanceCenter, w){
        if (Math.abs(d.x - w/2) < distanceCenter){
            return true;
        }
        else{
            return false;
        }
    }
    
    networkVis.prototype.layoutBipartite = function(distanceCenter, reducedNodes){
        thisObject = this;
        /*this.force
        .linkStrength(1)
        .gravity(0.1);*/
        
        reducedNodes.forEach(function(node,i){
            if (node.hasOwnProperty("layoutFixed") && node.layoutFixed){
                node.fixed = false;
                node.layoutFixed = false
            }
        });
        
        this.force.on("tick", function(e) {
                        var kx = 1.2 * e.alpha, ky = 1.2 * e.alpha;
						thisObject.svg.selectAll(".node")
                        .each(thisObject.collide(0.5 * e.alpha, reducedNodes))
                        .each(thisObject.layoutNodeBipartite(2 * e.alpha, thisObject, distanceCenter))
                        .attr("transform", function(d) {                            
							d.x = d3.max([d3.min([d.x,thisObject.width-20]),20]);
							d.y = d3.max([d3.min([d.y,thisObject.height-20]),20]);
							return "translate(" + d.x + "," + d.y + ")"; 
                        });
							
						thisObject.svg.selectAll(".link")
                        .attr("x1", function(d) { return d.source.x; })
							.attr("y1", function(d) { return d.source.y; })
							.attr("x2", function(d) { return d.target.x; })
							.attr("y2", function(d) { return d.target.y; });
							
						/*link2.attr("d", function(d) {
							var dx = nodes[d.target].x - nodes[d.source].x,
								dy = nodes[d.target].y - nodes[d.source].y,
								dr = Math.sqrt(dx * dx + dy * dy);
							
							return "M" + 
								nodes[d.source].x + "," + 
								nodes[d.source].y + "A" + 
								dr + "," + dr + " 0 0,1 " + 
								nodes[d.target].x + "," + 
								nodes[d.target].y;
						});*/
                        
				});
        this.force.start();        
    }
    
    networkVis.prototype.layoutNodeBipartite = function(kxy, thisObject, distanceCenter){
        return function(d){
            if ((d.tagName=="Event")){
                if (thisObject.inViolationBipartite(d, distanceCenter, thisObject.width)){
                //if (true){
                    d.x += (thisObject.width/2 + distanceCenter - d.x) * kxy;
                    //d.y += -(thisObject.height/2 - d.y) * kxy;
                }
            }
            else{
                if (thisObject.inViolationBipartite(d, distanceCenter, thisObject.width)){
                //if (true){
                    d.x += (thisObject.width/2 - distanceCenter - d.x) * kxy;
                    //d.y += (thisObject.height/2 - d.y) * kxy;
                }
            }
        }
    }  
    
   
    
    networkVis.prototype.inViolationBipartite = function(d, distanceCenter, w){
        if ((d.tagName == "Event")&&((d.x - w/2) < distanceCenter)){
            return true;
        }
        else{
            if ((!(d.tagName == "Event"))&&((d.x - w/2) > (-1)*distanceCenter)){
                return true;
            }
            else{
                return false;
            }
        }
    }
    
    
    networkVis.prototype.confidenceAlignedDiagonalLayout = function (reducedNodes){
        //identify event nodes
        var eventNodes = [];
        var thisObject = this;
        reducedNodes.forEach(function(node){
            if (node.tagName=="Event"){
                eventNodes.push(node)
            }
        });
        
        //sort reduced nodes by event nodes confidence
        eventNodes.sort(compare);
        
        //arrange equally spaced in the diagonal with fixed values
        var scaleDiagonal = d3.scale.ordinal().domain(d3.range(eventNodes.length)).rangePoints([20,this.width-20]);
        eventNodes.forEach(function(node,i){
            node.x = scaleDiagonal(i);
            node.px = scaleDiagonal(i);
            node.y = scaleDiagonal(i);
            node.py = scaleDiagonal(i);
            node.fixed = true;
            node.layoutFixed = true;
        });
        
        this.svg.selectAll(".node")
        .attr("transform", function(d) {                            
            d.x = d3.max([d3.min([d.x,thisObject.width-20]),20]);
            d.y = d3.max([d3.min([d.y,thisObject.height-20]),20]);
            return "translate(" + d.x + "," + d.y + ")"; 
        });
            
        this.svg.selectAll(".link")
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
            
        
        function compare(a,b) {
          if (a.value < b.value)
            return 1;
          else 
            return -1;          
        }
        this.force.start()
    }
    
    networkVis.prototype.confidenceAlignedCircularLayout = function (reducedNodes){
        //identify event nodes
        var eventNodes = [];
        var thisObject = this;
        reducedNodes.forEach(function(node){
            if (node.tagName=="Event"){
                eventNodes.push(node);
            }
        });
        
        //sort reduced nodes by event nodes confidence
        eventNodes.sort(compare);
        var nEventNodes = eventNodes.length;
        //arrange equally spaced in a circle of radious r with fixed values        
        var r = this.width/2 - 20;
        var angleInc = 2 * Math.PI/ nEventNodes;
        
        
        eventNodes.forEach(function(node,i){
            var xCoor = r * Math.cos(angleInc * i);
            node.x = xCoor + r + 20;
            node.px = node.x;
            //node.y = ((i<(nEventNodes/2))?Math.sqrt(Math.pow(r,2) - Math.pow(xCoor,2)):-Math.sqrt( Math.pow(r,2) - Math.pow(xCoor,2))) + r + 20;
            node.y = r * Math.sin(angleInc * i) + r + 20;
            node.py = node.y;
            node.fixed = true;
            node.layoutFixed = true;
        });
        
        this.svg.selectAll(".node")
        .attr("transform", function(d) {                            
            d.x = d3.max([d3.min([d.x,thisObject.width-20]),20]);
            d.y = d3.max([d3.min([d.y,thisObject.height-20]),20]);
            return "translate(" + d.x + "," + d.y + ")"; 
        });
            
        this.svg.selectAll(".link")
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
            
        
        function compare(a,b) {
          if (a.value < b.value)
            return 1;
          else 
            return -1;          
        }
        this.force.start()
    }
    
    
    // Resolve collisions between nodes.
    networkVis.prototype.collide = function(alpha, reducedNodes) {
      var thisObject = this;  
      var quadtree = d3.geom.quadtree(reducedNodes);
      return function(d) {
        var maxRadius = thisObject.scaleSize.range()[1]/6.66;
        var r = thisObject.scaleSize(Math.abs(d.value))/6.66 + maxRadius,
            nx1 = d.x - r,
            nx2 = d.x + r,
            ny1 = d.y - r,
            ny2 = d.y + r;
        quadtree.visit(function(quad, x1, y1, x2, y2) {
          if (quad.point && (quad.point !== d)) {
            var x = d.x - quad.point.x,
                y = d.y - quad.point.y,
                l = Math.sqrt(x * x + y * y),
                r = thisObject.scaleSize(Math.abs(d.value))/6.66 + thisObject.scaleSize(quad.point.value)/6.66;
            if (l < r) {
              l = (l - r) / l * alpha;
              d.x -= x *= l;
              d.y -= y *= l;
              quad.point.x += x;
              quad.point.y += y;
            }
          }
          return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        });
      };
    }
    
    //Ideas: collision avoidance (http://bl.ocks.org/mbostock/1804919), tree foci (view-source:https://mbostock.github.io/d3/talk/20110921/depth-foci.html), random disturbance
    
    // List functions you want other scripts to access
    window.network = {
        networkVis: networkVis
    };
})(window)