/*~~ API reference ~~~~~~~~~~~~~~~~~~~~~~~~~

https://api.highcharts.com/highmaps/

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/


/*~~~~~ Load external shapefiles and JCHS logo ~~~~~~*/
var counties = Highcharts.geojson(Highcharts.maps["countries/us/us-all-all-highres"])
var states = Highcharts.geojson(Highcharts.maps["countries/us/us-all-all-highres"], 'mapline')
var logoURL = "http://www.jchs.harvard.edu/sites/jchs.harvard.edu/files/harvard_jchs_logo_2017.png"

var data_classes_netflow = [
  {
    to: -1000,
    color: "#560101"
  },
  {
    from: -1000,
    to: -100,
    color: "#E3371E"
  },
  {
    from: -100,
    to: 0,
    color: "#FF8372" //Alternating between off-white: '#F9F6F5' and light red: '#FF8372'
  },
  {
    from: 0,
    to: 100,
    color: "#F9F6F5" //Alternating between off-white: '#F9F6F5' and light blue: '#B9EEEC'
  },
  {
    from: 100,
    to: 1000,
    color: "#ABBFC3"
  },
  {
    from: 1000,
    color: "#4E7686"
  }
]

var data_classes_immigrants = [
  {
    to: 0,
    color: "#FF8372"
  },
  {
    from: 0,
    to: 100,
    color: "#B9EEEC"
  },
  {
    from: 100,
    to: 1000,
    color: "#ABBFC3"
  },
  {
    from: 1000,
    color: "#4E7686"
  }
]

var selected_year = $('#select_year').val()
var selected_county_type = $('#county_type :checked').val()
var ref_data = []
var map_data = []

var baseURL = "https://sheets.googleapis.com/v4/spreadsheets/"
var API_Key = "AIzaSyDY_gHLV0A7liVYq64RxH7f7IYUKF15sOQ"
var API_params = "valueRenderOption=UNFORMATTED_VALUE"

//Change for specific source table
var SheetID = "1R1gYdP5oFk_qlrOZoXk3hGb4nXTOuwT4t07SrsunIAM"
var range = "Sheet1!A:R"

//Changing two outdated county names (changes effective 2015)
var countiesToChange = [
     {
  oldKey: 'us-sd-113',
  newFips: '46102',
  newName: 'Oglala Lakota'
  },
     {
  oldKey: 'us-ak-270',
  newFips: '02158',
  newName: 'Kusilvak'
  }
]

countiesToChange.forEach(function(newInfo) {
  var county = Highcharts.find(Highcharts.maps['countries/us/us-all-all-highres'].features, function (area) {
    return area.properties['hc-key'] === newInfo.oldKey
  })
  county.properties.fips = newInfo.newFips
  county.name = newInfo.newName
})

/*~~~~~~ Document ready function ~~~~~~~~~~~~~~~~~*/
$(document).ready(function () {
  createMap()
})


/*~~~~~~ Create the main map ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
function createMap () {

  /*~~~~~~~~ Google Sheet API request ~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
  //This is the data for the base map, the first thing that appears -RF
  var requestURL = baseURL
    + SheetID
    + "/values/"
    + range
    + "?key="
    + API_Key
    + "&"
    + API_params

  $.get(requestURL, function (obj) {
    console.log(requestURL)

    ref_data = obj.values

    map_data = ref_data
      .map(el => [el[0], el[11]])
      .filter(x => typeof x[1] !== 'string')

    /*~~~~~~~~ Standard JCHS Highcharts options ~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    Highcharts.setOptions({
      credits: { enabled: false },
      lang: {
        thousandsSep: ",",
        contextButtonTitle: "Export Map",
        downloadPDF: "Download as PDF",
        downloadCSV: "Download chart data (CSV)",
        downloadXLS: "Download chart data (Excel)"
      },
      colors: ['#4E7686', '#c14d00', '#998b7d', '#43273a', '#e9c002', '#76ad99', '#c4c6a6'],
    }) //end standard options


    /*~~~~~~~~~~~ Highcharts Map ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    map = Highcharts.mapChart("county_migration_map", {
      chart: {
        height: 600,
        width: 800,
        margin: [50, 30, 75, 10], //to allow space for title at top, legend at right, and notes at bottom
        borderWidth: 0,
        events: {
          load: function () {
            this.renderer
              .image(logoURL, 0, this.chartHeight - 80, 289, 85) //puts logo in lower left
              .add() // (src,x,y,width,height)            
          }
        }
      },

      mapNavigation: { enabled: true },

      subtitle: {
        //use subtitle element for our table notes
        text:
          "Notes: This is a test of the Vault-Tec emergency broadcast system. <br/>Source: JCHS tabulations of US Census Bureau, Population Estimates Program.",
        /*Original Census data note on international immigration explains how it can be negative (original understanding was only int'l inflows):
        [2] Net international migration for the United States includes the international migration of both native and foreign-born populations. Specifically, it includes: (a) the net international migration of the foreign born, (b) the net migration between the United States and Puerto Rico, (c) the net migration of natives to and from the United States, and (d) the net movement of the Armed Forces population between the United States and overseas. Net international migration for Puerto Rico includes the migration of native and foreign-born populations between the United States and Puerto Rico.*/
        
        widthAdjust: -300,
        align: "left",
        x: 300,
        y: -50, //may have to change this, depending on lenght of notes
        verticalAlign: "bottom",
        style: {
          color: "#999999",
          fontSize: "9px"
        }
      },

      //main title of chart
      title: {
        text:
         $('#county_type :checked').parent('label').text() + ', ' + selected_year,
        style: {
          color: "#C14D00",
          fontWeight: 600,
          fontSize: "18px"
        }
      },

      legend: { //Base netflow map legend
        title: {
          text: "Number of people<br />"
        },
        layout: "vertical",
        align: "right",
        verticalAlign: "middle",
        y: 110,
        x: 10,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        labelFormatter: function () {
          if ((this.from != null) & (this.to != null)) { //legend entries w/ upper & lower bound
            return this.from + " to " + this.to
          } else if (this.to != null) { //lowest legend entry
            return "Lower than " + this.to
          } else if (this.from != null) { //highest legend entry
            return "More than " + this.from
          }
        }
      },

      //define value ranges for the data
      colorAxis: {
        dataClasses: data_classes_netflow
      },

      series: [
        {
          type: "map",
          name: 'county map',
          mapData: counties,
          borderWidth: 0.5, //Thinner than usual to help see small counties
          //allAreas: false,
          data: map_data,
          joinBy: ["fips", 0],
          keys: ["fips", "value"],
          allowPointSelect: true,
          nullInteraction: true,
          states: {
            select: { color: "#000" } //highlights selected county
          },
          point: {
            events: {
              click: function (event) {
                console.log("clicked on map: " + event.point.name)
                //selected_metro = event.point.fips
                //selected_metro_name = event.point.name
                //focusMetro(event.point.fips, event.point.name)

              },
            } //end events
          } //end point
        },
        {
          type: "mapline",
          name: "State borders",
          data: states,
          color: "#333",
          lineWidth: 1, //Thinner than usual to help see small counties
          tooltip: { //make tooltip not show up for 'state borders'
            enabled: false
          }
        }
      ],

      tooltip: {
        formatter: function () {
          //console.log(this.point)
          if (this.point.value != null) {
            return (
              "<b>"
              + this.point.name
              + "</b><br/>"
              + 'Migrants'
              //+ this.series.name
              + ": "
              + this.point.value.toLocaleString()
            )
          } else if (this.point.name != null) {
            return (
              '<b>'
              + this.point.name
              + '</b>'
            )
          } else {
            return false
          }
        }
      },

      /*~~~~~~Exporting options~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
      exporting: {
        enabled: true,
        filename: "County-level Migration & Population Change",
        menuItemDefinitions: {
          /*downloadFullData: {
            text: "Download full dataset (Excel)",
            onclick: function() {
              window.open("http://www.jchs.harvard.edu/")
              alert("See tab A-1 for data from this chart")
            }
          }*/
        },
        buttons: {
          contextButton: {
            text: "Export",
            menuItems: [
              "printChart",
              "downloadPDF",
              "separator",
              "downloadPNG",
              "downloadJPEG"
              //'separator',
              //'downloadFullData'
            ],
            theme: {
              fill: "#ffffff00"
            }
          }
        }
      } //end exporting

    }) //end map

  }) //end get request

} //end createMap ()


$('#select_year').change(function () {
  var new_range = $('#select_year').val() + '!A:R'

  var requestURL = baseURL
    + SheetID
    + "/values/"
    + new_range
    + "?key="
    + API_Key
    + "&"
    + API_params

  $.get(requestURL, function (obj) {
    console.log(requestURL)

    var new_data = obj.values
      .map(el => [el[0], el[selected_county_type]])
      .filter(x => typeof x[1] !== 'string')

    map.series[0].setData(new_data)

  })

})


$('#county_type').change(function () {

  selected_county_type = $('#county_type :checked').val()
  selected_county_type = parseInt(selected_county_type) //to convert from string to int
  console.log(selected_county_type)

  //Loop first to create new data table
  var new_data = ref_data
    .map(el => [el[0], el[selected_county_type]])
    .filter(x => typeof x[1] !== 'string')

  map.series[0].setData(new_data)
  
  map.update({
    title: {
      text:
      $('#county_type :checked').parent('label').text() + ', ' + selected_year,
    },
  })
})
