// TODO:
//  -> Add info for specific year / point
//  -> Add a nice unobstructive fade in for both the year and color
//  -> Put an indicator when hovering which states to the user that the colors are specific for that year
//     indicating that it is intended to be an unobstructive way of showing the coolest and hottest temperatures

let rawData     = [];
let cleanData   = [];
let isRawActive = false;

// [0] Global constants
const width         = 900;
const height        = 700;
const marginTop     = 200;
const marginRight   = 40;
const marginBottom  = 20;
const marginLeft    = 40;
const overlap       = 14;

let x, y, z, area, line;

let infoBox = d3.select("#info-box");
let infoYear = d3.select("#info-year");
let infoCurrentTemp = d3.select("#info-current-temp");
let infoHottestTemp = d3.select("#info-hottest-temp");


function loadData() {
    return d3.json("./data/Daily_Ocean_Surface_Temp.json").then((data) => {
        let tempData = data.flatMap((yearlyData, yearIndex) => 
            yearlyData.data
            .map((temp, dayIndex) => ({
                temp: parseFloat(temp),
                    year: 1982 + yearIndex,
                    dayOfYear: dayIndex
            }))
            .filter(d => !isNaN(d.temp) && d.year !== 2024)
        );

        // [0] Map the data and retrieve only the necessary variables
        rawData = Array
            .from(d3.group(tempData, d => d.year).values())
            .map(yearData => yearData.length === 366 ? yearData.slice(0, 365) : yearData)
            .sort((a, b) => b[0].year - a[0].year);

        // [1] Calculate mean temperature based on all temperature values
        const meanTemp = d3.mean(tempData, d => d.temp);

        // [2] Calculate the mean temperature based on an individual year
        function getAnnualMeanTemp(year) {
            const yearData = tempData.filter(d => d.year === year);
            return d3.mean(yearData, d => d.temp);
        }

        // [2] Define scaling factor function - fix this 
        const getScalingFactor = (dayOfYear) => {
            const radians = (2 * Math.PI * dayOfYear) / 365;      // [2.1] Convert day of year to radians
            return (1 + (Math.sin(radians - Math.PI / 2))) * 10.0;     // [2.2] Sinusoidal function, peaks at mid-year
        };

        // [3] Generate amplified data
        cleanData = tempData.map(d => {
            const annualMeanTemp = getAnnualMeanTemp(d.year);
            const scalingFactor = getScalingFactor(d.dayOfYear);
            const ampTemp = (d.temp - annualMeanTemp) * (1 + scalingFactor) + meanTemp;

            return {
                ...d,
                temp: isNaN(ampTemp) ? null : ampTemp
            };
        }).filter(d => d.temp !== NaN && d.year != 2024);

        cleanData = Array
            .from(d3.group(cleanData, d => d.year).values())
            .map(yearData => yearData.length === 366 ? yearData.slice(0, 365) : yearData)
            .sort((a, b) => b[0].year - a[0].year);
    });
}

function app() {
    loadData().then(() => {
        drawArt(cleanData);
        addEventListeners();
    });
    scrollEffect();

    
}

function drawArt(dataset) {
    // [0]
    const xDomain = [0, dataset[0].length - 1];
    const yDomain = dataset.map((_, i) => i);
    const [minTemp, maxTemp] = [d3.min(dataset, d => d3.min(d, d => d.temp)), d3.max(dataset, d => d3.max(d, d => d.temp))];

    // [1]
    x = d3.scaleLinear()
        .domain(xDomain)
        .range([marginLeft, width - marginRight]);

    y = d3.scalePoint()
        .domain(yDomain)
        .range([marginTop, height - marginBottom]);

    z = d3.scaleLinear()
        .domain([minTemp, maxTemp])
        .range([0, -overlap * y.step()]);

    area = d3.area()
        .defined(d => !isNaN(d.temp))
        .x((_, i) => x(i))
        .y0(0)
        .y1(d => z(d.temp))
        .curve(d3.curveBasis);

    line = area.lineY1();

    // [] Create the SVG container
    const svg = d3.select("#art-container").append("svg")
        .attr("width", width)
        .attr("height", height);

    // [] Create the series groups
    const serie = svg.append("g")
        .selectAll("g")
        .data(dataset, d => d[0].year)
        .enter()
        .append("g")
        .attr("transform", (_, i) => `translate(0, ${y(i) + 1})`);

    // [] Draw area and line paths
    serie.append("path")
        .attr("fill", "#000")
        .attr("d", area)
        .attr("class", "area-path");

    serie.append("path")
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("d", line)
        .attr("class", "line-path");

    // Define gradient
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

    // Add circles for data points
    serie.selectAll("circle")
        .data(d => d)
        .enter()
        .append("circle")
        .attr("cx", (_, i) => x(i))
        .attr("cy", d => z(d.temp))
        .attr("r", 5)
        .attr("fill", "none")
        .attr("opacity", 0.4)
        .attr("pointer-events", "all")
        .on("mouseover", function(event, d) {
            if (isRawActive) {
                d3.select(this.parentNode).select(".line-path").attr("stroke", "url(#tempGradient)");
                d3.select(this).attr("fill", "url(#tempGradient)");
            }
        })
        .on("mouseout", function(_, _) {
            if (isRawActive) {
                d3.select(this.parentNode).select(".line-path").attr("stroke", "white");
                d3.select(this).attr("fill", "none");
            }
        })
        .on("click", function(event, d) {
            const yearData = dataset.find(yd => yd[0].year === d.year);
            const hottestTemp = d3.max(yearData, d => d.temp);

            // Update info box
            infoYear.html(`<strong>Year:</strong> ${d.year}`);
            infoCurrentTemp.html(`<strong>Current Temp:</strong> ${d.temp.toFixed(2)} °C`);
            infoHottestTemp.html(`<strong>Hottest Temp:</strong> ${hottestTemp.toFixed(2)} °C`);
        });

    // X axis
    const monthStartDays = [
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

    // [] Create the X-axis:
    const xAxis = d3.axisBottom(x)
        .tickValues(monthStartDays.map(d => d.day))
        .tickFormat((_, i) => monthStartDays[i].month)
        .ticks(width / 80);

    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(xAxis)
        .call(g => g.selectAll("text").attr("fill", "white"))
        .call(g => g.selectAll("line").attr("stroke", "white"))
        .call(g => g.selectAll("path").attr("stroke", "white")); 

    d3.select(".x-axis")
        .style("display", "none")
        .transition()
        .duration(500)  
        .style("opacity", 0);
}

function updateArt(newData) {
    y = d3.scalePoint()
        .domain(newData.map((_, i) => i))
        .range([marginTop, height - marginBottom]);

    x = d3.scaleLinear()
        .domain([0, newData[0].length - 1])
        .range([marginLeft, width - marginRight]);

    z = d3.scaleLinear()
        .domain([
            d3.min(newData, d => d3.min(d, d => d.temp)),
            d3.max(newData, d => d3.max(d, d => d.temp))
        ])
        .range([0, -overlap * y.step()]);

    area = d3.area()
        .defined(d => !isNaN(d.temp))
        .x((_, i) => x(i))
        .y0(0)
        .y1(d => z(d.temp))
        .curve(d3.curveBasis);

    line = area.lineY1();

    const xAxis = d3.select(".x-axis");

    if (newData === cleanData) {
        xAxis.transition()
            .duration(500)  // Duration of the fade-out effect
            .style("opacity", 0)
            .on("end", () => xAxis.style("display", "none"));  // Ensure it's hidden after the fade-out
    } else {
        xAxis.style("display", "block")
            .transition()
            .duration(500)  // Duration of the fade-in effect
            .style("opacity", 1);
    }

    const serie = d3.select("#art-container").selectAll("g").data(newData, d => {
        if (d && d[0]) { 
            return d[0].year; 
        } else {
            console.warn("Skipping undefined or empty dataset:", d);
            return null;  // Return null to avoid binding faulty data
        }
    });

    // []
    serie.selectAll(".area-path")
        .data(d => [d])
        .transition()
        .duration(1000)
        .attr("d", area);

    // []
    serie.selectAll(".line-path")
        .data(d => [d])
        .transition()
        .duration(1000)
        .attr("d", line);

    // []
    serie.selectAll("circle")
        .data(d => d)
        .transition()
        .duration(1000)
        .attr("cy", d => z(d.temp));
}

function addEventListeners() {
    document.getElementById("raw-view-button").addEventListener("click", () => {
        if (!isRawActive) 
        {
            isRawActive = true;
            toggleInfoBoxVisibility();
            updateArt(rawData);
        }
    });

    document.getElementById("artistic-view-button").addEventListener("click", () => {
        if (isRawActive) 
        {
            isRawActive = false;
            toggleInfoBoxVisibility();
            updateArt(cleanData);
        }
    });
}

// [] jQuery used to operate the smooth scrolling between the <section> elements:
function scrollEffect() {
    $(document).ready(function() {
        var contentSections = $('.content-section');
        var navigation = $('nav');

        // [] Smooth scroll to the section when a nav link is clicked
        navigation.on('click', 'a', function(event) {
            event.preventDefault(); // Prevent default action
            smoothScroll($(this.hash));
        });

        // [] Update navigation and section visibility on scroll
        $(window).on('scroll', function() {
            updateNavigation();
        });

        // [] Initial update for navigation and sections visibility
        updateNavigation();

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
                scrollTop: target.offset().top - 30
            }, 800);
        }
    });
}

function toggleInfoBoxVisibility() {
    if (isRawActive) {
        infoBox.style("display", "block");
    } else {
        infoBox.style("display", "none");
    }
}

// []
document.addEventListener("DOMContentLoaded", () => {
    const rightSideImage = document.querySelector('.right-side-image');
    const leftSideImage = document.querySelector('.left-side-image');

    attachMouseEvents(rightSideImage);
    attachMouseEvents(leftSideImage);

    function attachMouseEvents(image) {
        let bounds;

        // Define the event handler outside of the event listener
        const handleMouseMove = (e) => rotateToMouse(e, image, bounds);

        image.addEventListener('mouseenter', () => {
            bounds = image.getBoundingClientRect();
            document.addEventListener('mousemove', handleMouseMove);
        });

        image.addEventListener('mouseleave', () => {
            console.log("Mouse has left");
            document.removeEventListener('mousemove', handleMouseMove);
            // Reset transform when mouse leaves
            image.style.transform = '';
        });
    }

    function rotateToMouse(e, image, bounds) {
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const leftX = mouseX - bounds.x;
        const topY = mouseY - bounds.y;
        const center = {
            x: leftX - bounds.width / 2,
            y: topY - bounds.height / 2
        };
        const distance = Math.sqrt(center.x ** 2 + center.y ** 2);

        image.style.transform = 
        `
            scale3d(1.05, 1.05, 1.05)
            rotate3d(
                ${center.y / 100},
                ${-center.x / 100},
                0,
                ${Math.log(distance) * 2}deg
            )
        `;
    }
});


app();