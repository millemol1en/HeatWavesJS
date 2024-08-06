// TODO:
//  -> Add info for specific year / point
//  -> Add a nice unobstructive fade in for both the year and color
//  -> Put an indicator when hovering which states to the user that the colors are specific for that year
//     indicating that it is intended to be an unobstructive way of showing the coolest and hottest temperatures

let rawData     = [];
let cleanData   = [];

function loadData() {
    return d3.json("./data/Daily_Ocean_Surface_Temp.json").then((data) => {
        // [0] Map the data and retrieve only the necessary variables
        rawData = data.flatMap((yearlyData, yearIndex) => 
            yearlyData.data
                .map((temp, dayIndex) => ({
                    temp: parseFloat(temp),
                    year: 1982 + yearIndex,
                    dayOfYear: dayIndex
                }))
                .filter(d => !isNaN(d.temp))
        );

        // TODO: REMOVE THIS
        const getMonth = (dayOfYear) => {
            const date = new Date(1980, 0); // Start from a non-leap year
            date.setDate(dayOfYear + 1);    // Set day of year
            return date.getMonth() + 1;     // getMonth is zero-based
        };

        // [1] Calculate mean temperature
        const meanTemp = d3.mean(rawData, d => d.temp);

        // [2] Define scaling factor function - fix this 
        const getScalingFactor = (dayOfYear) => {
            const radians = (2 * Math.PI * dayOfYear) / 365;      // [2.1] Convert day of year to radians
            return 2 * (1 + Math.sin(radians - Math.PI / 2));     // [2.2] Sinusoidal function, peaks at mid-year
        };

        // [3] Generate amplified data
        cleanData = rawData.map(d => {
            const scalingFactor = getScalingFactor(d.dayOfYear) * 20.0;

            const ampTemp = (d.temp - meanTemp) * (1 + scalingFactor) + meanTemp;

            const month = getMonth(d.dayOfYear);

            return {
                ...d,
                amplifiedTemp: isNaN(ampTemp) ? null : ampTemp
            };
        }).filter(d => d.amplifiedTemp !== NaN && d.year != 2024);

        cleanData = Array.from(d3.group(cleanData, d => d.year).values())
            .map(yearData => yearData.length === 366 ? yearData.slice(0, 365) : yearData)
            .sort((a, b) => b[0].year - a[0].year);

        console.log("Loaded and cleaned data:", cleanData); // [TODO] REMOVE THIS
    });
}

function app() {
    loadData().then(() => {
        drawArt();
    });
    scrollEffect();

    
}


function drawArt() {
    // [0]
    const width = 1200;
    const height = 760;
    const marginTop = 200;
    const marginRight = 10;
    const marginBottom = 20;
    const marginLeft = 50;
    const overlap = 14;

    // [1]
    const x = d3.scaleLinear()
        .domain([0, cleanData[0].length - 1])
        .range([marginLeft, width - marginRight])

    const y = d3.scalePoint()
        .domain(cleanData.map((_, i) => i))
        .range([marginTop, height - marginBottom])

    const z = d3.scaleLinear()
        .domain([
            d3.min(cleanData, d => d3.min(d, d => d.amplifiedTemp)),
            d3.max(cleanData, d => d3.max(d, d => d.amplifiedTemp))
        ])
        .range([0, -overlap * y.step()])

    const area = d3.area()
        .defined(d => {
            const isValid = !isNaN(d.amplifiedTemp);
            if (!isValid) {
                console.log("Invalid data point in area:", d);
            }
            return isValid;
        })
        .x((_, i) => x(i))
        .y0(0)
        .y1(d => z(d.amplifiedTemp))
        .curve(d3.curveBasis);

    const line = area.lineY1();

    // DEBUGGING
    // console.log("x scale domain:", x.domain());
    // console.log("x scale range:", x.range());
    // console.log("y scale domain:", y.domain());
    // console.log("y scale range:", y.range());
    // console.log("z scale domain:", z.domain());
    // console.log("z scale range:", z.range());

    // [] Target and create the main SVG to contain the generative art:
    const svg = d3.select("#art-container").append("svg")
        .attr("width", width)
        .attr("height", height);

    const serie = svg.append("g")
        .selectAll("g")
        .data(cleanData)
        .enter()
        .append("g")
            .attr("transform", (d, i) => `translate(0, ${y(i) + 1})`);

    serie.append("path")
        .attr("fill", "#000")
        .attr("d", area)
        .attr("class", "area-path");
    
    serie.append("path")
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("d", line)
        .attr("class", "line-path");

    // [] Used to create the linear gradient
    svg.append("defs").append("linearGradient")
        .attr("id", "tempGradient")
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "0%")
        .attr("y2", "100%")
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "red");

    svg.select("defs").select("linearGradient")
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "blue");

    // []
    const yearLabel = svg.append("text")
        .attr("x", marginLeft - 10) // Position it to the left of the margin
        .attr("y", marginTop) // Initial y position (will be updated)
        .attr("text-anchor", "end") // Align the text to the end (right-align)
        .attr("fill", "white") // Text color
        .attr("font-size", "12px") // Font size
        .attr("visibility", "hidden"); // Initially hidden

    serie.selectAll("circle")
        .data(d => d)
        .enter()
        .append("circle")
            .attr("cx", (_, i) => x(i))
            .attr("cy", d => {
                return z(d.amplifiedTemp);
            })
            .attr("r", 5) 
            .attr("fill", "none")
            //.attr("fill", "orange")
            .attr("opacity", 0.4)
            .attr("pointer-events", "all")              // ! Allows the circles to capture events. Thanks for wasting 3 hours JS.
            .on("mouseover", function(event, d) {
                const locateFirstDataPointByYear = (year) => {
                    return cleanData[(2023 - year)][0].amplifiedTemp;
                }

                d3.select(this.parentNode).select(".line-path").attr("stroke", "url(#tempGradient)");
                d3.select(this).attr("fill", "url(#tempGradient)");

                //console.log(`Z value: ${z((locateFirstDataPointByYear(d.year)))}`);


                yearLabel
                    //.attr("y", z((locateFirstDataPointByYear(d.year)))) 
                    .attr("transform", `translate(0, ${z(locateFirstDataPointByYear(d.year))})`)
                    .attr("visibility", "visible") 
                    .text(d.year);
            })
            .on("mouseout", function(event, d) {
                d3.select(this.parentNode).select(".line-path").attr("stroke", "white");
                d3.select(this).attr("fill", "none");

                yearLabel.attr("visibility", "hidden");
            });

    // serie.append("path")
    //     .attr("fill", "#fff")
    //     .attr("d", d => {
    //         const pathData = area(d);
    //         console.log("Area path data for year", d[0].year, ":", pathData);
    //         return area(d);
    //     });

    // serie.append("path")
    //     .attr("fill", "none")
    //     .attr("stroke", "black")
    //     .attr("d", d => {
    //         const pathData = line(d);
    //         console.log("Line path data for year", d[0].year, ":", pathData);
    //         return pathData;
    //     });

    const monthStartDays = 
    [
        { month: "Jan", day: 0 },
        { month: "Feb", day: 31 },
        { month: "Mar", day: 59 },
        { month: "Apr", day: 90 },
        { month: "May", day: 120 },
        { month: "Jun", day: 151 },
        { month: "Jul", day: 181 },
        { month: "Aug", day: 212 },
        { month: "Sep", day: 243 },
        { month: "Oct", day: 273 },
        { month: "Nov", day: 304 },
        { month: "Dec", day: 334 }
    ];

    const xAxis = d3.axisBottom(x)
        .tickValues(monthStartDays.map(d => d.day))
        .tickFormat((d, i) => monthStartDays[i].month)
        .ticks(width / 80);

    // [] We append the axis to our main SVG, setting the 'text', 'line' and 'path' to being white:
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(xAxis)
        .call(g => g.selectAll("text").attr("fill", "white")) 
        .call(g => g.selectAll("line").attr("stroke", "white")) 
        .call(g => g.selectAll("path").attr("stroke", "white")); 
}

function scrollEffect() {
    $(document).ready(function() {
        var contentSections = $('.content-section');
        var navigation = $('nav');

        // Smooth scroll to the section when a nav link is clicked
        navigation.on('click', 'a', function(event) {
            event.preventDefault(); // Prevent default action
            smoothScroll($(this.hash));
        });

        // Update navigation and section visibility on scroll
        $(window).on('scroll', function() {
            updateNavigation();
        });

        // Initial update for navigation and sections visibility
        updateNavigation();

        ///// FUNCTIONS
        function updateNavigation() {
            var scrollTop = $(window).scrollTop();
            var windowHeight = $(window).height();

            contentSections.each(function() {
                var section = $(this);
                var sectionName = $(this).attr('id');
                var navigationMatch = $('nav a[href="#' + sectionName + '"]');
                var sectionOffset = section.offset().top;
                var sectionHeight = section.height();
                var sectionBottom = sectionOffset + sectionHeight;

                // Section is considered active if it is at least halfway in view
                var isActive = (scrollTop + windowHeight > sectionOffset + sectionHeight / 2) &&
                               (scrollTop < sectionBottom - sectionHeight / 2);

                if (isActive) {
                    section.addClass('active');
                    navigationMatch.addClass('active');
                } else {
                    section.removeClass('active');
                    navigationMatch.removeClass('active');
                }
            });
        }

        function smoothScroll(target) {
            $('body,html').animate({
                scrollTop: target.offset().top
            }, 800);
        }
    });
}





app();