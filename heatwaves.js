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
        drawSequentialAnimatedCircularVisualization()
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

function drawSequentialAnimatedCircularVisualization() {
    // Define the dimensions and margins for the SVG container
    const width = 800;
    const height = 800;
    const innerRadius = 100;
    const outerRadius = Math.min(width, height) / 2 - 50;

    // Set up the SVG container
    let svg = d3.select("#circle-svg");
    if (svg.empty()) {
      svg = d3.select("body").append("svg").attr("id", "circle-svg");
    }

    svg
      .attr("width", width)
      .attr("height", height)
      .selectAll("*").remove(); // Clear previous content if any

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Define scales for angle (theta) and radius (r)
    const theta = d3.scaleUtc()
      .domain([Date.UTC(1982, 0, 1), Date.UTC(2024, 0, 1)])
      .range([0, 2 * Math.PI]);

    const r = d3.scaleLinear()
      .domain([d3.min(OSTData, d => d.temp), d3.max(OSTData, d => d.temp)])
      .range([innerRadius, outerRadius]);

    // Define the color scale with blue for cooler temperatures and red for warmer
    const radialColour = d3.scaleSequential(d3.interpolateRdBu)
      .domain([d3.max(OSTData, d => d.temp), d3.min(OSTData, d => d.temp)]);

    // Add a text element for displaying the current year
    const yearText = g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", "3em")
      .attr("fill", "#444");

    // Function to draw and animate each year's data
    function animateYearData(yearData, index) {
      // Update the year display
      const year = yearData[0].date.getUTCFullYear();
      setTimeout(() => {
        yearText.text(year);
      }, index * 100); // Update year text with the same delay

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
        .delay(index * 100) // Delay each year's animation
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
  
  }

app();