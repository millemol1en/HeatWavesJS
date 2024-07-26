var OSTData      = [];
var CO2AtmosData = [];


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
}

function app() {
    loadData().then(() => {
        console.log("Ocean Temp Data: ", OSTData);
        console.log("Rising CO2 Atmo: ", CO2AtmosData);
    });
}


app();