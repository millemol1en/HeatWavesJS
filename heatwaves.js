var OSTData      = [];
var CO2AtmosData = [];

const chartWidth = 750
const chartHeight = 750
const margin = 37.5
const innerRadius = 93.75
const outerRadius = 337.5

function loadData() {
    return Promise.all([
        // [0] Loading Monthly Ocean Surface Temperature JSON data:
        d3.json("./data/Monthly_Ocean_Surface_Temp.json").then((d) => {
            OSTData = d[0].data;
        }),

        // [1] Load CO2 Levels in Atmosphere CSV data:
        d3.csv("./data/Rising_CO2_Levels_In_Atmosphere_Data.csv").then((d) => {
            CO2AtmosData = d;
        })
    ])
};

function app() {
    loadData().then(() => {
        console.log("Ocean Temp Data: ", OSTData);
        console.log("Rising CO2 Atmo: ", CO2AtmosData);
    });
}

// WAVE EFFECT:
const waveSVG = d3.select("#wave-svg");
const lineWidth = 12;

const scaleX = d3.scaleLinear()
    .domain([0, 300])
    .range([0, parseFloat(waveSVG.style("width"))]);

const scaleY = d3.scaleLinear()
    .domain([0, 120])
    .range([0, parseFloat(waveSVG.style("height")) - lineWidth]);

// Bezier curve using Lerping:
const bezierLine = d3.line()
    .curve(d3.curveBasis)
    .x((d) => scaleX(d[0]))
    .y((d) => scaleY(d[1]));

function generateSine(y, step, mean, varyMean) {
    const sine = {
        amplitude: Math.random() * 5 + 20, // [5, 25]
        period: Math.random() * 0.25 + 0.05, // [0.05, 0.3]
        repeats: 1 + Math.round(Math.random() * 3), // [1, 4]
        meanOffset: varyMean ? Math.random() * 50 - 25 : 0 // [-25, 25]
    };
    
    // Calculate a gradual decrease or increase the mean
    function offset(i) {
        return Math.min(i, 2 * Math.PI) * sine.meanOffset;
    }
    
    const offsetX = y.length * step;
    let runningX = 0;
    while (runningX < 2 * Math.PI * sine.repeats) {
        const m = mean + offset(runningX);
        y.push(m + sine.amplitude * Math.sin(runningX + offsetX));
        runningX += 2 * Math.PI * step / sine.period;
    }
}

const line = waveSVG
    .append("path")
    .datum(function() {
        const domain = scaleX.domain();
        const nPoints = 50;
        const points = d3.range(nPoints).map(function(v) {
        return v / (nPoints - 1);
        });
        const step = points[1] - points[0];

        const x = points.map(function(v) {
        return domain[0] + v * (domain[1] - domain[0]);
        });
        const xStep = x[1] - x[0];
        
        // Draw two points just before and just after the visible part of the wave
        // to make the lines run smoothly
        x.unshift(x[0] - xStep); x.push(x[x.length - 1] + xStep);

        const y = [];
        const mean = d3.sum(scaleY.domain()) / 2;
        while(y.length < x.length) {
        generateSine(y, step, mean, true);
        }

        return {
            x: x,
            y: y,
            mean: mean,
            step: step
        };
  })
    .attr("stroke", "url(#b1xGradient)")
    .attr("stroke-width", lineWidth)
    .attr("fill", "none");

line
    .transition("grow")
    .duration(900)
    .attrTween("stroke-dasharray", function() {
        const len = this.getTotalLength() * 2;
        return (t) => d3.interpolateString("0," + len, len + ",0")(t);
});

function wave() {
    line
        .attr("d", function(d) {
            let bLine = bezierLine(d.x.map(function(v, i) {
            // We store some additional variables at the end of y,
            // we don't want to show yet
                return [v, d.y[d.x.length - 1 - i]];
            }));

            return bLine;
        })
        .datum(function(d) {
            const y = d.y;
            // Remove the y value that was just moved out of view
            y.shift();      
            // See if we still have enough y values left, otherwise, generate some
            while(y.length < d.x.length) {
                generateSine(y, d.step, d.mean);
            }

            return d;
        })
            .attr("transform", function(d) {

        const step = d.x[1] - d.x[0];
            return `translate(${-scaleX(step)})`
        })
            .transition("wave")
            .duration(function(d) { return 5000 / d.x.length; })
            .ease(d3.easeLinear)
            .attr("transform", "translate(0)")
            .on("end", function() {
                // Repeat
                wave();
        });
}

// MOLECULE:
// class Atom {
//     constructor(id, x, y, r, type, mass) {
//         this.id = id;
//         this.x = x;
//         this.y = y;
//         this.r = r;
//         this.type = type;
//         this.mass = mass;
//         this.vx = 0;
//         this.vy = 0;
//     }
// }


// const moleculeContainer = d3.select("#molecule");

// const svg = moleculeContainer.append("svg")
//     .attr("width", 600)
//     .attr("height", 600)
//     .style("background-color", "orange");

// const atoms = [
//     new Atom('C', 300, 200, 20, 'carbon', 10),
//     new Atom('O1', 200, 200, 15, 'oxygen', 10),
//     new Atom('O2', 400, 200, 15, 'oxygen', 10),
// ];

// const bonds = [
//     { source: 'C', target: 'O1' },
//     { source: 'C', target: 'O2' }
// ];

// const bondLines = svg.selectAll("line")
//     .data(bonds)
//     .enter()
//     .append("line")
//         .attr("x1", d => atoms.find(atom => atom.id === d.source).x)
//         .attr("y1", d => atoms.find(atom => atom.id === d.source).y)
//         .attr("x2", d => atoms.find(atom => atom.id === d.target).x)
//         .attr("y2", d => atoms.find(atom => atom.id === d.target).y)
//         .attr("stroke", "gray")
//         .attr("stroke-width", 2);

// const atomCircles = svg.selectAll("circle")
//     .data(atoms)
//     .enter()
//     .append("circle")
//     .attr("cx", d => d.x)
//     .attr("cy", d => d.y)
//     .attr("r", d => d.r)
//     .attr("class", d => d.type)
//     .attr("fill", d => d.type === 'carbon' ? 'black' : 'red');

// const atomLabels = svg.selectAll("text")
//     .data(atoms)
//     .enter()
//     .append("text")
//     .attr("x", d => d.x)
//     .attr("y", d => d.y)
//     .attr("dy", ".35em")
//     .attr("text-anchor", "middle")
//     .attr("fill", "white")
//     .text(d => d.id);

// const width = +svg.attr("width");
// const height = +svg.attr("height");

// const simulation = d3.forceSimulation(atoms)
//     .force("link", d3.forceLink(bonds).id(d => d.id).distance(30))
//     .force("charge", d3.forceManyBody().strength(-400))
//     .force("center", d3.forceCenter(width / 2, height / 2))
//     .on("tick", ticked);

// function ticked() {
//     bondLines
//         .attr("x1", d => d.source.x)
//         .attr("y1", d => d.source.y)
//         .attr("x2", d => d.target.x)
//         .attr("y2", d => d.target.y);

//     atomCircles
//         .attr("cx", d => d.x)
//         .attr("cy", d => d.y);

//     atomLabels
//         .attr("x", d => d.x)
//         .attr("y", d => d.y);
// }

// const drag = d3.drag()
//     .on("start", dragstarted)
//     .on("drag", dragged)
//     .on("end", dragended);

// atomCircles.call(drag);

// function dragstarted(event, d) {
//     if (!event.active) simulation.alphaTarget(0.3).restart();
//     d.fx = d.x;
//     d.fy = d.y;
// }

// function dragged(event, d) {
//     d.fx = event.x;
//     d.fy = event.y;
// }

// function dragended(event, d) {
//     if (!event.active) simulation.alphaTarget(0);
//     d.fx = null;
//     d.fy = null;
// }



app();
wave();