let OSTData     = [];
let AvgData     = []; // Averaged data collection
let moleculeArr = [];
let maxTemp;
let minTemp;

const width = 800;
const height = 800;

//////////////////////////
//                      //
//      LOAD DATA       //
//                      //
//////////////////////////
function loadData() {
    return Promise.all([
        // [0] Loading Monthly Ocean Surface Temperature JSON data:
        d3.json("./data/Monthly_Ocean_Surface_Temp.json").then((d) => {
            // OSTData = d[0].data;
            OSTData = d[0].data.map(item => ({
                date: new Date(item[0].replace(/,/g, '/')),
                temp: parseFloat(item[1])
            }));
            maxTemp = d3.max(OSTData, d => d.temp);
            minTemp = d3.min(OSTData, d => d.temp);


            const dataByYear = d3.groups(OSTData, d => d.date.getUTCFullYear());

            // Find the largest temperature increase for each year
            const largestTempIncreases = dataByYear.map(([year, data]) => {
                let maxIncrease = -Infinity;
                for (let i = 1; i < data.length; i++) {
                    const increase = data[i].temp - data[i - 1].temp;
                    if (increase > maxIncrease) {
                        maxIncrease = increase;
                    }
                }
                return { year: year, maxIncrease: maxIncrease };
            });
        }),

        // [1] Loading Molecules JSON data:
        d3.json("./data/molecules.json").then((d) => {
            const moleculesData = d.Molecules;

            for (let key in moleculesData) {
                if (moleculesData.hasOwnProperty(key)) {
                    let molecule = new Molecule(moleculesData[key].atoms, moleculesData[key].links);
                    moleculeArr.push(molecule);
                }
            }
        })
    ])
};

// [1] Run the application:
function app() {
    loadData().then(() => {
        drawCircularBarChart();

        drawMolecules();
    });
};

// [2] Get the data for a molecule by its name:
function getMoleculeData(moleculeName, moleculesData) {
  if (moleculesData && moleculesData.Molecules && moleculesData.Molecules[moleculeName]) {
      return moleculesData.Molecules[moleculeName];
  }
  return null;
};

//////////////////////////
//                      //
//       MOLECULES      //
//                      //
//////////////////////////
class Molecule {
    constructor(atoms, links) {
        this.atoms = atoms,
        this.links = links
    }
};

function drawMolecules() {
    let color = d3.scaleOrdinal(d3.schemeCategory10);
    let  radius = d3.scaleSqrt().range([0, 6]);

    // [0]
    const svg = d3.select("#molecule-svg")
        .attr("width", width)
        .attr("height", height);

    let atoms = [];
    let links = [];

    // []
    moleculeArr.forEach((molecule, moleculeIndex) => {
        // [0]
        molecule.atoms.forEach((atom, atomIndex) => {
            atoms.push({
                ...atom,
                moleculeIndex,
                atomIndex,
                x: Math.random() * width,
                y: Math.random() * height
            });
        });

        // [] Establishing the links
        molecule.links.forEach(link => {
            links.push({
                ...link,
                source: link.source + atoms.length - molecule.atoms.length,
                target: link.target + atoms.length - molecule.atoms.length
            });
        });
    });

    const linkForce = d3.forceLink(links).id((d, i) => i).distance(d => (radius(d.source.size) + radius(d.target.size))).strength(1);
    const chargeForce = d3.forceManyBody().strength(-100);
    const centerForce = d3.forceCenter(width / 2, height / 2);

    const simulation = d3.forceSimulation(atoms)
            .force("link", linkForce)
            .force("charge", chargeForce)
            .force("center", centerForce)
            .on("tick", ticked);

    const link = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke-width", d => Math.sqrt(d.value));

    const node = svg.append("g")
        .selectAll("circle")
        .data(atoms)
        .join("circle")
            .attr("r", d => d.size)
            .attr("stroke", "#fff")
            .attr("stroke-width", "2px")
            .attr("fill", d => color(d.atom))
            .on("click", function(event, d) {
              d3.select(this).transition()
                  .duration(500)
                  .ease(d3.easeCubic)
                  .attrTween("fill", () => radialTransition(getColor(d.atom), getDarkerColor(d.atom)));
            })
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended))
            

    node.append("text")
        .attr("font", "10px")
        .text(d => d.atom)
        .attr("fill", "black");

    function ticked() {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    }

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
};

function radialTransition(startColor, endColor) {
  return function(t) {
      let r1, g1, b1, r2, g2, b2;
      [r1, g1, b1] = d3.color(startColor).rgb().array();
      [r2, g2, b2] = d3.color(endColor).rgb().array();
      let r = r1 + t * (r2 - r1),
          g = g1 + t * (g2 - g1),
          b = b1 + t * (b2 - b1);
      return d3.rgb(r, g, b);
  }
}

function getColor(atom) {
  switch(atom) {
      case 'C': return 'black';
      case 'O': return 'red';
      case 'N': return 'blue';
      default: return 'gray';
  }
}

function getDarkerColor(atom) {
  switch(atom) {
      case 'C': return '#333';
      case 'O': return '#800000';
      case 'N': return '#000080';
      default: return '#555';
  }
}


// function drawMolecules() {
//     let color = d3.scaleOrdinal(d3.schemeCategory10);

//     let radius = d3.scaleSqrt()
//         .range([0, 6]);

//     let svg = d3.select("#molecule-svg")
//         .attr("width", width)
//         .attr("height", height);

//     let simulation = d3.forceSimulation()
//         .force("charge", d3.forceManyBody().strength(-800))
//         .force("link", d3.forceLink().distance(d => radius(d.source.size) + radius(d.target.size) + 20))
//         .force("center", d3.forceCenter(width / 2, height / 2));

//     d3.json("./data/molecules.json").then((d) => {
//         Object.keys(d.Molecules).forEach(moleculeName => {
//             var graph = d.Molecules[moleculeName];

//             console.log(graph);

//             simulation
//                 .nodes(graph.atoms)
//                 .on("tick", ticked);

//             simulation.force("link")
//                 .links(graph.links);

//             var link = svg.selectAll(".link-" + moleculeName)
//                 .data(graph.links)
//                 .enter().append("g")
//                 .attr("class", "link link-" + moleculeName);

//             link.append("line")
//                 .style("stroke-width", function(d) { return (d.bond * 2 - 1) * 2 + "px"; });

//             link.filter(function(d) { return d.bond > 1; }).append("line")
//                 .attr("class", "separator");

//             var node = svg.selectAll(".node-" + moleculeName)
//                 .data(graph.atoms)
//                 .enter().append("g")
//                 .attr("class", "node node-" + moleculeName)
//                 .call(d3.drag()
//                     .on("start", dragstarted)
//                     .on("drag", dragged)
//                     .on("end", dragended));

//             node.append("circle")
//                 .attr("r", function(d) { return radius(d.size); })
//                 .style("fill", function(d) { return color(d.atom); });

//             node.append("text")
//                 .attr("dy", ".35em")
//                 .attr("text-anchor", "middle")
//                 .text(function(d) { return d.atom; });

//             function ticked() {
//                 link.selectAll("line")
//                     .attr("x1", function(d) { return d.source.x; })
//                     .attr("y1", function(d) { return d.source.y; })
//                     .attr("x2", function(d) { return d.target.x; })
//                     .attr("y2", function(d) { return d.target.y; });

//                 node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
//             }

//             function dragstarted(event, d) {
//                 if (!event.active) simulation.alphaTarget(0.3).restart();
//                 d.fx = d.x;
//                 d.fy = d.y;
//             }

//             function dragged(event, d) {
//                 d.fx = event.x;
//                 d.fy = event.y;
//             }

//             function dragended(event, d) {
//                 if (!event.active) simulation.alphaTarget(0);
//                 d.fx = null;
//                 d.fy = null;
//             }
//         });
//     }).catch(function(error) {
//         console.error('Error loading or parsing data:', error);
//     });
// }


////////////////////////////
//                        //
//    CIRCULAR BAR CHART  //
//                        //
////////////////////////////

function drawPulsarArt() {
    
}



function drawCircularBarChart() {
    // Define the dimensions and margins for the SVG container
    const innerRadius = 100;
    const outerRadius = Math.min(width, height) / 2 - 50;
    
    // Set up SVG container
    let svg = d3.select("#circle-svg");
    if (svg.empty()) {
        svg = d3.select("body").append("svg").attr("id", "circle-svg");
    }

    svg
        .attr("width", width)
        .attr("height", height)
        .selectAll("*").remove(); 

    const g = svg.append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    const theta = d3
        .scaleUtc()
        .domain([Date.UTC(1982, 0, 1), Date.UTC(2024, 0, 1)])
        .range([0, 2 * Math.PI]);

    const r = d3.scaleLinear()
        .domain([d3.min(OSTData, d => d.temp), d3.max(OSTData, d => d.temp)])
        .range([innerRadius, outerRadius]);

    const radialColour = d3.scaleSequential(d3.interpolateRdBu)
        .domain([d3.max(OSTData, d => d.temp), d3.min(OSTData, d => d.temp)]);

    // Add a text element for displaying the current year
    const yearText = g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", "1.5em")
        .attr("fill", "#ffffff");

    // Function to draw and animate each year's data
    function animateYearData(yearData, index) {
        // Update the year display
        const year = yearData[0].date.getUTCFullYear();
        setTimeout(() => {
          yearText.text(year);
        }, index * 165); // Update year text with the same delay

        g.selectAll(".year-path-" + index)
          .data(yearData)
          .enter().append("path")
          .attr("class", "year-path-" + index)
          .attr("fill", d => radialColour(d.temp))  // Use a uniform color for each bar
          .attr("stroke", "none") // Remove the white border by setting stroke to none
          .attr("d", d => d3.arc()
              .innerRadius(innerRadius)
              .outerRadius(innerRadius) // Start with innerRadius
              .startAngle(theta(d.date))
              .endAngle(theta(d3.timeMonth.offset(d.date, 1)))()
          )
          .transition()
          .delay(index * 160) // Delay each year's animation
          .duration(2000)
          .attrTween("d", function(d) {
              const interpolateOuterRadius = d3.interpolate(innerRadius, r(d.temp));
              return function(t) {
                  return d3.arc()
                    .innerRadius(innerRadius)
                    .outerRadius(interpolateOuterRadius(t))
                    .startAngle(theta(d.date))
                    .endAngle(theta(d3.timeMonth.offset(d.date, 1)))();
              };
          });
    }

    // Group data by year and animate sequentially
    const dataByYear = d3.groups(OSTData, d => d.date.getUTCFullYear());
    dataByYear.forEach((yearGroup, index) => {
        animateYearData(yearGroup[1], index);
    });  
};





app();