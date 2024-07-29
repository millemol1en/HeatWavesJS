let OSTData = [];
let maxTemp = 21.5;
let minTemp = 19.5;

function loadData() {
    return Promise.all([
        // [0] Loading Monthly Ocean Surface Temperature JSON data:
        d3.json("./data/Monthly_Ocean_Surface_Temp.json").then((d) => {
            // OSTData = d[0].data;
            OSTData = d[0].data.map(item => ({
                date: new Date(item[0].replace(/,/g, '/')),
                temp: item[1]
            }));
        })
    ])
};

function app() {
    loadData().then(() => {
        
        drawChart();
    });
}

function drawChart() {
    console.log("Ocean Temp Data: ", OSTData);

        const svg = d3.select("#wave-svg");
        const width = svg.node().getBoundingClientRect().width;
        const height = svg.node().getBoundingClientRect().height;

        const margin = { top: 20, right: 50, bottom: 30, left: 50 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const xScale = d3.scaleTime()
            .domain(d3.extent(OSTData, d => d.date))
            .range([0, innerWidth]);

        const yScale = d3.scaleLinear()
            .domain([d3.min(OSTData, d => d.temp), d3.max(OSTData, d => d.temp)])
            .range([innerHeight, 0]);

        const colorScale = d3.scaleSequential(d3.interpolateRdBu)
            .domain([d3.max(OSTData, d => d.temp), d3.min(OSTData, d => d.temp)]);

        const lineGenerator = d3.line()
            .x(d => xScale(d.date))
            .y(d => yScale(d.temp));

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Define the gradient
        const gradient = svg.append("defs")
            .append("linearGradient")
            .attr("id", "temperature-gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "0%");

        // Add gradient stops based on the temperature data
        OSTData.forEach((d, i) => {
            gradient.append("stop")
                .attr("offset", `${(i / (OSTData.length - 1)) * 100}%`)
                .attr("stop-color", colorScale(d.temp));
        });

        g.append("path")
            .datum(OSTData)
            .attr("fill", "none")
            .attr("stroke", "url(#temperature-gradient)")
            .attr("stroke-width", 2)
            .attr("d", lineGenerator);

        const path = g.select("path");

        const totalLength = path.node().getTotalLength();

        path
            .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(8000)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);

        // path
        //     .on("mouseover", function(event, d) {
        //         d3.select(this).attr("r", 6).attr("fill", "orange");
        //         showInfo(d);
        //     })
        //     .on("mouseout", function() {
        //         d3.select(this).attr("r", 3).attr("fill", "red");
        //         hideInfo();
        //     });

        const yearLabel = d3.select("#year-label");

        const numDataPoints = OSTData[OSTData.length - 1].date.getFullYear() - OSTData[0].date.getFullYear();
        console.log(numDataPoints);
        let currentYear  = 1982;

        d3.interval(() => {
            if (currentYear <= 2024) {
                yearLabel.text(currentYear);

                currentYear++;
            }
        }, 8000 / numDataPoints);
}

app();