var width = window.innerWidth;
var height = window.innerHeight;
var currentWidth = width;
var currentHeight = height;
var link_distance = 150;
var charge = -1000;
var default_link_color = "#ccc";
var default_arrow_color = "#888";
var default_highlight_color = "#888";
var default_arrow_opacity = 1;
var highlight_color = "orange";
var highlight_opacity = 0;
var nominal_text_size = 10;
var max_text_size = 24;
var link_stroke = 1;
var max_link_stroke = 4.5;
var min_zoom = 0.1;
var max_zoom = 7;
var text_center = false;

var force = d3.layout.force()
    .linkDistance(link_distance)
    .charge(charge)
    .gravity(0)
    .size([currentWidth, currentHeight]);

var tip = d3.tip()
    .attr('class', 'd3-tip')
    .html(function (d) {
        return "<strong>Title:</strong> <span style='color:orange'>" + d.title + "</span>" +
            "<br><strong>Authors:</strong> <span style='color:orange'>" + d.authors + "</span>";
    })
    .offset([-10, 0]);

d3.json("http://7ktqp1.com1.z0.glb.clouddn.com/data.json", function (error, graph) {
    d3.select("body").select("svg").remove();
    var svg = d3.select("body").append("svg").call(tip);
    var zoom = d3.behavior.zoom().scaleExtent([min_zoom, max_zoom]);
    var g = svg.append("g");
    svg.style("cursor", "move");

    var linkedByIndex = {};
    graph.links.forEach(function (d) {
        linkedByIndex[d.source + "," + d.target] = true;
    });

    function isConnected(a, b) {
        return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index] || a.index == b.index;
    }

    force.nodes(graph.nodes)
        .links(graph.links)
        .start();

    var link = g.selectAll(".link")
        .data(graph.links)
        .enter().append("line")
        .attr("class", "link")
        .style("stroke-width", link_stroke)
        .style("stroke", default_link_color);

    var arrow = g.selectAll("path")
        .data(graph.links)
        .enter().append("svg:path")
        .attr("class", "link")
        .style("fill", default_arrow_color)
        .style("stroke-width", link_stroke)
        .style("stroke", default_arrow_color)
        .style("opacity", default_arrow_opacity);

    var node = g.selectAll(".node")
        .data(graph.nodes)
        .enter().append("g")
        .attr("class", "node")
        .call(force.drag);

    var circle = node.append("circle")
        .attr("r", function (d) {
            return d.size;
        })
        .style("fill", function (d) {
            return d.color;
        })
        .style("stroke-width", link_stroke)
        .style("stroke", default_highlight_color)
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);

    var text = g.selectAll(".text")
        .data(graph.nodes)
        .enter().append("text")
        .attr("dy", ".35em")
        .style("font-size", nominal_text_size + "px");

    if (text_center) {
        text.text(function (d) {
            return d.title;
        })
            .style("text-anchor", "middle");
    } else {
        text.attr("dx", function (d) {
            return d.size;
        })
            .text(function (d) {
                return '\u2002' + d.title;
            });
    }

    var isNodeSelected = false, isNodeHighlighted = false;

    node.on("mouseover", mouseover)
        .on("mousedown", mousedown)
        .on("mouseout", mouseout);

    d3.select(window).on("mouseup", mouseup);

    function mouseover(d) {
        isNodeHighlighted = true;
        if (!isNodeSelected && isNodeHighlighted) {
            highlightNodeWithRelations(d);
        }
    }

    function mouseout() {
        isNodeHighlighted = false;
        // d3.event.stopPropagation();
        if (!isNodeSelected) {
            setDefaultStyles();
        }
    }

    function mousedown(d) {
//            force.stop();
        if (isNodeSelected) {
            setDefaultStyles();
            isNodeSelected = false;
        } else {
            highlightNodeWithRelations(d);
            isNodeSelected = true;
        }
    }

    function mouseup() {
        force.stop();
    }

    function highlightNodeWithRelations(d) {
        circle
            .style("opacity", function (o) {
                return isConnected(d, o) ? 1 : highlight_opacity;
            })
            .style("stroke", function (o) {
                return isConnected(d, o) ? highlight_color : default_highlight_color;
            });

        text.style("opacity", function (o) {
            return isConnected(d, o) ? 1 : highlight_opacity;
        }).html(function (o) {
            return o.title;
        }).style("font-weight", function (o) {
            return isConnected(d, o) ? "bold" : "normal";
        });

        var setHighlightColor = function (o) {
            return o.source.index == d.index || o.target.index == d.index ? highlight_color : default_highlight_color;
        };

        link.style("opacity", function (o) {
            return o.source.index == d.index || o.target.index == d.index ? 1 : highlight_opacity;
        }).style("stroke", setHighlightColor);

        arrow.style("stroke", setHighlightColor)
            .style("fill", setHighlightColor)
            .style("opacity", function (o) {
                return o.source.index == d.index || o.target.index == d.index ? 1 : highlight_opacity;
            });
    }

    function setDefaultStyles() {
        circle
            .style("opacity", 1)
            .style("stroke", default_highlight_color);
        text
            .style("opacity", 1)
            .style("font-weight", "normal")
            .text(function (d) {
                return d.title;
            });
        link
            .style("opacity", 1)
            .style("stroke", default_link_color);
        arrow
            .style("fill", default_arrow_color)
            .style("stroke", default_arrow_color)
            .style("opacity", default_arrow_opacity);
    }

    zoom.on("zoom", function () {
        var stroke = link_stroke;
        if (link_stroke * zoom.scale() > max_link_stroke) stroke = max_link_stroke / zoom.scale();
        link.style("stroke-width", stroke);
        circle.style("stroke-width", stroke)
            .attr("r", function (d) {
                return d.size;
            });

        if (!text_center) text.attr("dx", function (d) {
            return d.size;
        });

        var text_size = nominal_text_size;
        if (nominal_text_size * zoom.scale() > max_text_size) text_size = max_text_size / zoom.scale();
        text.style("font-size", text_size + "px");

        g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    });

    svg.call(zoom);

    resize();
//window.focus();
    d3.select(window).on("resize", resize);

    force.on("tick", tick);

    function countArrowPosition(d) {
        var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            h = Math.sqrt(dx * dx + dy * dy),
            r = d.target.size,
            x = d.target.x - r * dx / h,
            y = d.target.y - r * dy / h;
        return {x: x, y: y};
    }

    function tick() {
        node.attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });
        text.attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });

        link.attr("x1", function (d) {
            return d.source.x;
        })
            .attr("y1", function (d) {
                return d.source.y;
            })
            .attr("x2", function (d) {
                return countArrowPosition(d).x;
            })
            .attr("y2", function (d) {
                return countArrowPosition(d).y;
            });

        arrow.attr("d", function (d) {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                cos = Math.cos(Math.atan2(dy, dx)),
                sin = Math.sin(Math.atan2(dy, dx)),
                x = countArrowPosition(d).x - 2 * cos,
                y = countArrowPosition(d).y - 2 * sin,
                length = 10, width = 5;
            return "M" + x + "," + y + "l" +
                (width * sin - length * cos) + "," +
                (-width * cos - length * sin) + "L" +
                (x - width * sin - length * cos) + "," +
                (y + width * cos - length * sin) + "z";
        });

        node.attr("cx", function (d) {
            return d.x;
        })
            .attr("cy", function (d) {
                return d.y;
            });
    }

    function resize() {
        svg.attr("width", width).attr("height", height);
        force.size([force.size()[0] + (width - currentWidth) / zoom.scale(), force.size()[1] + (height - currentHeight) / zoom.scale()]).resume();
        currentWidth = width;
        currentHeight = height;
    }
});