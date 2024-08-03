let OSTData = [];

function loadData() {
    return d3.json("./data/Daily_Ocean_Surface_Temp.json").then((data) => {
        OSTData = data.flatMap((yearlyData, yearIndex) => 
            yearlyData.data
                .map((temp, dayIndex) => ({
                    date: new Date(1982 + yearIndex, 0, 1 + dayIndex),  // Start from 1982 and add days
                    temp: parseFloat(temp),
                    year: 1982 + yearIndex,
                    dayOfYear: dayIndex
                }))
                .filter(d => !isNaN(d.temp))  // Filter out invalid values
        );
    });
}

function app() {
    loadData().then(() => {
        // 'width' and 'height' needs to be dynamic
        const width = 1200;
        const height = 760;
        const marginTop = 350;
        const marginRight = 10;
        const marginBottom = 20;
        const marginLeft = 10;
        const overlap = 16;
        const yearPadding = 50; 
        const amplificationFactor = 5;

        const meanTemp = d3.mean(OSTData, d => d.temp);
        const peak = 0; 

        const getScalingFactor = (dayOfYear) => {
            //                             (dayOfYear * peak) if you want the spikey 'wave' effect!
            const radians = (2 * Math.PI * (dayOfYear - peak)) / 365;  // Convert day of year to radians
            return 0.5 * (1 + Math.sin(radians - Math.PI / 2));  // Sinusoidal function, peaks at mid-year
        };

        const amplifiedData = OSTData.map(d => {
            const scalingFactor = getScalingFactor(d.dayOfYear);

            const ampTemp = (d.temp - meanTemp) * amplificationFactor * scalingFactor + meanTemp;
            return {
                ...d,
                amplifiedTemp: isNaN(ampTemp) ? null : ampTemp
            };
        }).filter(d => d.amplifiedTemp !== NaN);

        const x = d3.scaleLinear()
            .domain([0, 365])  // Normalized for each year
            .range([marginLeft, width - marginRight]);

        const z = d3.scaleBand()
            .domain([...new Set(OSTData.map(d => d.year))])
            .range([height - marginBottom - marginBottom, marginTop])
            .padding(0.1);

        // const yExtent = d3.extent(amplifiedData, d => d.amplifiedTemp);

        // console.log(`yExtentn Idx .1: ${yExtent[0]} --- yExtentn Idx .2: ${yExtent[1]}`);

        const y = d3.scaleLinear()
            .domain(d3.extent(amplifiedData, d => d.amplifiedTemp))  // Adjust based on temperature values
            .range([0, z.bandwidth()]);

        const line = d3.line()
            .defined(d => !isNaN(d.amplifiedTemp))
            .x(d => x(d.dayOfYear))
            .y(d => y(d.amplifiedTemp) * (-40));   // Change this! * 20

        const svg = d3.select('body')
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .attr("style", "max-width: 100%; height: auto;");

            
        

        svg.append("g")
            .attr("fill", "none")
            .attr("stroke", "black")
            .selectAll("path")
            .data(d3.groups(amplifiedData, d => d.year))
            .join("path")
            .attr("transform", d => `translate(0,${z(d[0])})`)
            .attr("d", d => line(d[1]))
            .on("mousemove", function(event, d) { pointermoved(event, d); })  // Pass the whole group data 'd'
            .on("mouseleave", pointerleft);
        

                /********************************** 
             * 
             * HOVER EFFECT GOES HERE
             * 
            ***********************************/

           
        const tooltip = svg.append("g")
            .style("display", "none");
        
        tooltip.append("path")
            .attr("fill", "brown")
            .attr("stroke", "black");
        
        const toolTipText = tooltip.append("text");
            
    function pointermoved(event, groupData) {
        if (!groupData || !groupData[1]) {
            console.warn("groupData or groupData[1] is undefined", groupData);
            return;
        }

        const [mx] = d3.pointer(event);
        const dayOfYear = x.invert(mx);
        const dataForYear = groupData[1];  // Extract the actual data from groupData
        const year = groupData[0];  // Extract the year

        console.log("dataForYear:", dataForYear, "year:", year);

        // Find the closest data point in the current year's data
        const i = d3.bisector(d => d.dayOfYear).left(dataForYear, dayOfYear, 1);
        const a = dataForYear[i - 1];
        const b = dataForYear[i];

        if (!a || !b) return;

        const d = dayOfYear - a.dayOfYear > b.dayOfYear - dayOfYear ? b : a;

        tooltip.style("display", null);
        tooltip.attr("transform", `translate(${x(d.dayOfYear)},${z(year) + y(d.amplifiedTemp) * -40})`);

        tooltip.selectAll("path")
            .data([,])
            .join("path")
            .attr("d", `M-10,-10 H10 V10 H-10 Z`);

        toolTipText
            .selectAll("tspan")
            .data([`Year: ${d.year}`, `Temp: ${d.amplifiedTemp.toFixed(2)}°C`])
            .join("tspan")
            .attr("x", 0)
            .attr("y", (d, i) => `${i * 1.1}em`)
            .attr("font-weight", (_, i) => i ? null : "bold")
            .text(d => d);
    }

    function pointerleft() {
        tooltip.style("display", "none");
    }

        // Update the event listeners
    svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "black")
        .selectAll("path")
        .data(d3.groups(amplifiedData, d => d.year))
        .join("path")
        .attr("transform", d => `translate(0,${z(d[0])})`)
        .attr("d", d => line(d[1]))
        .on("mousemove", function(event, d) { pointermoved(event, d); })  // Pass the whole group data 'd'
        .on("mouseleave", pointerleft);



    });

        
    }


   

        








        // Add X-axis
        /* 
        svg.append("g")
            .attr("transform", `translate(0,${height - marginBottom})`)
            .call(d3.axisBottom(x)
                .tickValues(d3.range(0, 365, 30))  // Monthly intervals
                .tickFormat(d => {
                    const month = new Date(1982, 0, d).toLocaleString('default', { month: 'short' });
                    return d % 30 === 0 ? month : "";  // Show month name only at the start of each month
                }))
            .call(g => g.select(".domain").remove());
        
        // Y-Axis (Temperature) [TODO: Condense this down to make it more simple]
        
        const yAxis = svg.append("g")
            .attr("class", "y axis")
            .call(d3.axisLeft(y).ticks(5));

        yAxis.append("text")
            .attr("fill", "#000")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "-5.1em")
            .attr("text-anchor", "end")
            .text("Temperature (°C)");
        
        // Z-axis (Years)
        svg.append("g")
            .selectAll("text")
            .data([...new Set(OSTData.map(d => d.year))])
            .join("text")
            .attr("x", -marginLeft)
            .attr("y", d => z(d) + z.bandwidth() / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "start")
            .text(d => d);
        */
  

app();



// let OSTData = [];

// function loadData() {
//     return d3.json("./Monthly_Ocean_Surface_Temp.json").then((d) => {
//         OSTData = d[0].data.map((item, index) => ({
//             month: new Date(item[0].replace(/,/g, '/')).getMonth(),  // Extract month as an integer (0-11)
//             temp: parseFloat(item[1]),
//             year: Math.floor(index / 12)  // Group by year
//         }));
//     });
// }

// function app() {
//     loadData().then(() => {
//         const width = 1152;
//         const height = 760;
//         const marginTop = 60;
//         const marginRight = 10;
//         const marginBottom = 20;
//         const marginLeft = 10;
//         const overlap = 16;

//         const x = d3.scaleLinear()
//             .domain([0, 11])  // Months from 0 to 11
//             .range([marginLeft, width - marginRight]);

//         const z = d3.scalePoint()
//             .domain([...new Set(OSTData.map(d => d.year))])
//             .range([marginTop, height - marginBottom]);

//         const y = d3.scaleLinear()
//             .domain(d3.extent(OSTData, d => d.temp))  // Adjust based on temperature values
//             .range([0, -overlap * z.step()]);

//         const line = d3.line()
//             .defined(d => !isNaN(d.temp))
//             .x(d => x(d.month))
//             .y(d => y(d.temp));

//         const svg = d3.select("#art-container")
//             .append("svg")
//             .attr("width", width)
//             .attr("height", height)
//             .attr("viewBox", [0, 0, width, height])
//             .attr("style", "max-width: 100%; height: auto;");

//         svg.append("g")
//             .attr("fill", "none")
//             .attr("stroke", "black")
//             .selectAll("path")
//             .data(d3.groups(OSTData, d => d.year))
//             .join("path")
//             .attr("transform", d => `translate(0,${z(d[0])})`)
//             .attr("d", d => line(d[1]));

//         // Add X-axis
//         svg.append("g")
//             .attr("transform", `translate(0,${height - marginBottom})`)
//             .call(d3.axisBottom(x).ticks(12).tickFormat(d3.format("d")))  // Tick for each month
//             .call(g => g.select(".domain").remove())
//             .call(g => g.select(".tick:first-of-type text").append("tspan").attr("x", 10).text(" month"));

//         // Add labels for the Y-axis (Temperature)
//         const yAxis = svg.append("g")
//             .attr("class", "y axis")
//             .call(d3.axisLeft(y).ticks(5));

//         yAxis.append("text")
//             .attr("fill", "#000")
//             .attr("transform", "rotate(-90)")
//             .attr("y", 6)
//             .attr("dy", "-5.1em")
//             .attr("text-anchor", "end")
//             .text("Temperature (°C)");
//     });
// }

// app();






// let OSTData     = [];

// function loadData() {
//     return d3.json("./Monthly_Ocean_Surface_Temp.json").then((d) => {
//         OSTData = d[0].data.map((item, index) => ({
//             x: index,
//             y: parseFloat(item[1]),
//             z: Math.floor(index / 12)  // Group by year
//         }));
//         maxTemp = d3.max(OSTData, d => d.y);
//         minTemp = d3.min(OSTData, d => d.y);
//     });
// }


// function draw() {
//     const width = 1152;
//     const height = 760;
//     const marginTop = 60;
//     const marginRight = 10;
//     const marginBottom = 20;
//     const marginLeft = 10;
//     const overlap = 16;

//     const x = d3.scaleLinear()
//         .domain(d3.extent(OSTData, d => d.x))
//         .range([marginLeft, width - marginRight]);

//     const z = d3.scalePoint()
//         .domain(OSTData.map(d => d.z))
//         .range([marginTop, height - marginBottom]);

//     const y = d3.scaleLinear()
//         .domain([0, 11])
//         .range([0, -overlap * z.step()]);

//     const line = d3.line()
//         .defined(d => !isNaN(d.y))
//         .x(d => x(d.x))
//         .y(d => y(d.y));

//     const svg = d3.select("#art-container")
//         .append("svg")
//         .attr("width", width)
//         .attr("height", height)
//         .attr("viewBox", [0, 0, width, height])
//         .attr("style", "max-width: 100%; height: auto;");

//     svg.append("g")
//         .attr("fill", "white")
//         .attr("stroke", "black")
//         .selectAll("path")
//         .data(d3.groups(OSTData, d => d.z))
//         .join("path")
//         .attr("transform", d => `translate(0,${z(d[0])})`)
//         .attr("d", d => line(d[1]));

//     svg.append("g")
//         .attr("transform", `translate(0,${height - marginBottom})`)
//         .call(d3.axisBottom(x).ticks(width / 80))
//         .call(g => g.select(".domain").remove())
//         .call(g => g.select(".tick:first-of-type text").append("tspan").attr("x", 10).text(" ms"));
// }

// function app() {
//     loadData().then(() => {
//         draw();
//     });
// }

// app();