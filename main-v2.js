mapboxgl.accessToken = 'pk.eyJ1IjoiaGFveXUtZnNmIiwiYSI6ImNrNnNyYmN5NjBrNGIzZnBidTJkd201cWQifQ.OHz_Lulnto908cgqxQtqtQ';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v10',
  center: [-122.4414,37.7749],
  zoom: 11.5,
});
map.addControl(new mapboxgl.NavigationControl());

console.log(typeof(permit.features[0].properties.Risk_score_fk))
permit2  = parseFloat(permit.features[0].properties.Risk_score_fk)
console.log(permit2)

const risk1 = ['<', ['get' , 'Risk_score_fk'], 0.4];
const risk2 = ['all', ['>=', ['get', 'Risk_score_fk'], 0.4],['<', ['get', 'Risk_score_fk'], 0.7]]; 
const risk3 = ['all', ['>=', ['get', 'Risk_score_fk'], 0.7],['<', ['get', 'Risk_score_fk'], 0.85]]; 
const risk4 = ['>', ['get' , 'Risk_score_fk'], 0.85];

const colors = ['#a5abb5', '#70de3a', '#eb740c', '#e31a1c'];

map.on('load', function() {
    // add a clustered GeoJSON source for a sample set of earthquakes
    map.addSource('permit', {
    'type': 'geojson',
    'data': permit,
    'cluster': true,
    'clusterRadius': 80,
    'clusterProperties': {
    // keep separate counts for each magnitude category in a cluster
    'risk1': ['+', ['case', risk1, 1, 0]],
    'risk2': ['+', ['case', risk2, 1, 0]],
    'risk3': ['+', ['case', risk3, 1, 0]],
    'risk4': ['+', ['case', risk4, 1, 0]],
    },
    'maxzoom':13
    });





    map.addSource('test_lower_layer', {
        'type': 'geojson',
        // data: './Jsons/PermitLast10k.geojson' //This saves time but consumes more memory
        'data': permit,
        });
    map.addLayer({
        'id': 'lower_layer', 
        'type': 'circle', 
        'source':'test_lower_layer',
        'paint': {
            'circle-color': [
            'case',
            risk1,
            colors[0],
            risk2,
            colors[1],
            risk3,
            colors[2],
            colors[3]
            ],
            'circle-opacity': 0.6,
            'circle-radius': 8},
        'minzoom':13
        
    })
    map.addLayer({
        'id': 'risk_label',
        'type': 'symbol',
        'source': 'permit',
        'filter': ['!=', 'cluster', true],
        'layout': {
        'text-field': [
        'number-format',
        ['get', 'Risk_score_fk'],
        { 'min-fraction-digits': 2, 'max-fraction-digits': 2}
        ],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 6
        },
        'paint': {
        'text-color': [
        'case',
        ['<', ['get', 'Risk_score_fk'], 0.85],
        'white',
        'black'
        ]
        }, 
        });

    // objects for caching and keeping track of HTML marker objects (for performance)
    var markers = {};
    var markersOnScreen = {};

    function updateMarkers() {
        var newMarkers = {};
        var features = map.querySourceFeatures('permit');
         
        // for every cluster on the screen, create an HTML marker for it (if we didn't yet),
        // and add it to the map if it's not there already
        for (var i = 0; i < features.length; i++) {
        var coords = features[i].geometry.coordinates;
        var props = features[i].properties;
        if (!props.cluster) continue;
        var id = props.cluster_id;
         
        var marker = markers[id];
        if (!marker) {
        var el = createDonutChart(props);
        marker = markers[id] = new mapboxgl.Marker({
        element: el
        }).setLngLat(coords);
        }
        newMarkers[id] = marker;
         
        if (!markersOnScreen[id]) marker.addTo(map);
        }
        // for every marker we've added previously, remove those that are no longer visible
        for (id in markersOnScreen) {
        if (!newMarkers[id]) markersOnScreen[id].remove();
        }
        markersOnScreen = newMarkers;
        }
    map.on('data', function(e) {
        if (e.sourceId !== 'permit' || !e.isSourceLoaded) return;
            
        map.on('move', updateMarkers);
        map.on('moveend', updateMarkers);
        updateMarkers();
        });
    const marker11 = new mapboxgl.Popup()
    map.on('click', 'lower_layer', function(e){
        const coordinates = e.features[0].geometry.coordinates.slice();
        const risk_score = e.features[0].properties.Risk_score_fk;
        const ticketNumber = e.features[0].properties.Permit_Number;
        const status = e.features[0].properties.Current_Status;


        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }
            
        marker11
        .setLngLat(coordinates)
        .setHTML(
        'Ticket Number: ' + ticketNumber + '<br><p>Current Status: '+ status+ "</p>"+'<br><p>Risk Score(fake): ' + risk_score+"</p>"
        )
        .addTo(map);

    });
    // map.on('mouseleave', 'lower_layer', function(e){
    //     marker11.remove()

    // });

    // inspect a cluster on click
    map.on('hover', 'clusters', function(e) {
        var features = map.queryRenderedFeatures(e.point, {
        layers: ['clusters']
        });
        var clusterId = features[0].properties.cluster_id;
        map.getSource('earthquakes').getClusterExpansionZoom(
        clusterId,
        function(err, zoom) {
        if (err) return;
        
        map.easeTo({
        center: features[0].geometry.coordinates,
        zoom: zoom
        });
        }
        );
        });





});

function createDonutChart(props) {
    var offsets = [];
    var counts = [
    props.risk1,
    props.risk2,
    props.risk3,
    props.risk4,
    ];
    var total = 0;
    for (var i = 0; i < counts.length; i++) {
    offsets.push(total);
    total += counts[i];
    }
    var fontSize =
    total >= 1000 ? 22 : total >= 100 ? 20 : total >= 10 ? 18 : 16;
    var r = total >= 1000 ? 50 : total >= 100 ? 32 : total >= 10 ? 24 : 18;
    var r0 = Math.round(r * 0.6);
    var w = r * 2;
     
    var html =
    '<div><svg width="' +
    w +
    '" height="' +
    w +
    '" viewbox="0 0 ' +
    w +
    ' ' +
    w +
    '" text-anchor="middle" style="font: ' +
    fontSize +
    'px sans-serif; display: block">';
     
    for (i = 0; i < counts.length; i++) {
    html += donutSegment(
    offsets[i] / total,
    (offsets[i] + counts[i]) / total,
    r,
    r0,
    colors[i]
    );
    }
    html +=
    '<circle cx="' +
    r +
    '" cy="' +
    r +
    '" r="' +
    r0 +
    '" fill="white" /><text dominant-baseline="central" transform="translate(' +
    r +
    ', ' +
    r +
    ')">' +
    total.toLocaleString() +
    '</text></svg></div>';
     
    var el = document.createElement('div');
    el.innerHTML = html;
    return el.firstChild;
    }
     
function donutSegment(start, end, r, r0, color) {
    if (end - start === 1) end -= 0.00001;
    var a0 = 2 * Math.PI * (start - 0.25);
    var a1 = 2 * Math.PI * (end - 0.25);
    var x0 = Math.cos(a0),
    y0 = Math.sin(a0);
    var x1 = Math.cos(a1),
    y1 = Math.sin(a1);
    var largeArc = end - start > 0.5 ? 1 : 0;
        
    return [
    '<path d="M',
    r + r0 * x0,
    r + r0 * y0,
    'L',
    r + r * x0,
    r + r * y0,
    'A',
    r,
    r,
    0,
    largeArc,
    1,
    r + r * x1,
    r + r * y1,
    'L',
    r + r0 * x1,
    r + r0 * y1,
    'A',
    r0,
    r0,
    0,
    largeArc,
    0,
    r + r0 * x0,
    r + r0 * y0,
    '" fill="' + color + '" />'
    ].join(' ');
    }
document.getElementById('fly').addEventListener('click', function() {
    // Fly to a random location by offsetting the point -74.50, 40
    // by up to 5 degrees.
    map.flyTo({
    center: [-98.4936, 29.4241],
    zoom:10,
    essential: true // this animation is considered essential with respect to prefers-reduced-motion
    });
    });











// const colors = ['#8dd3c7','#ffffb3','#bebada','#fb8072','#80b1d3','#fdb462','#b3de69','#fccde5','#d9d9d9','#bc80bd','#ccebc5'];

// const colorScale = d3.scaleOrdinal()
//   .domain(["hydro", "solar", "wind", "gas", "oil","coal", "biomass", "waste", "nuclear", "geothermal", "others"])
//   .range(colors)

// const hydro = ['==', ['get', 'fuel1'], 'Hydro'];
// const solar = ['==', ['get', 'fuel1'], 'Solar'];
// const wind = ['==', ['get', 'fuel1'], 'Wind'];
// const gas = ['==', ['get', 'fuel1'], 'Gas'];
// const oil = ['==', ['get', 'fuel1'], 'Oil'];
// const coal = ['==', ['get', 'fuel1'], 'Coal'];
// const biomass = ['==', ['get', 'fuel1'], 'Biomass'];
// const waste = ['==', ['get', 'fuel1'], 'Waste'];
// const nuclear = ['==', ['get', 'fuel1'], 'Nuclear'];
// const geothermal = ['==', ['get', 'fuel1'], 'Geothermal'];
// const others = ['any',
//   ['==', ['get', 'fuel1'], 'Cogeneration'],
//   ['==', ['get', 'fuel1'], 'Storage'],
//   ['==', ['get', 'fuel1'], 'Other'],
//   ['==', ['get', 'fuel1'], 'Wave and Tidel'],
//   ['==', ['get', 'fuel1'], 'Petcoke'],
//   ['==', ['get', 'fuel1'], '']
// ];

// map.on('load', () => {
//   // add a clustered GeoJSON source for powerplant
//   map.addSource('permit', {
//     'type': 'geojson',
//     'data': permit,
//     'cluster': true,
//     'clusterRadius': 100,
//     'clusterProperties': { // keep separate counts for each fuel category in a cluster
//       'hydro': ['+', ['case', hydro, 1, 0]],
//       'solar': ['+', ['case', solar, 1, 0]],
//       'wind': ['+', ['case', wind, 1, 0]],
//       'gas': ['+', ['case', gas, 1, 0]],
//       'oil': ['+', ['case', oil, 1, 0]],
//       'coal': ['+', ['case', coal, 1, 0]],
//       'biomass': ['+', ['case', biomass, 1, 0]],
//       'waste': ['+', ['case', waste, 1, 0]],
//       'nuclear': ['+', ['case', nuclear, 1, 0]],
//       'geothermal': ['+', ['case', geothermal, 1, 0]],
//       'others': ['+', ['case', others, 1, 0]]
//     }
//   });

//   map.addLayer({
//     'id': 'powerplant_individual',
//     'type': 'circle',
//     'source': 'permit',
//     'filter': ['!=', ['get', 'cluster'], true],
//     'paint': {
//       'circle-color': ['case',
//         hydro, colorScale('hydro'),
//         solar, colorScale('solar'),
//         wind, colorScale('wind'),
//         gas, colorScale('gas'),
//         oil, colorScale('oil'),
//         coal, colorScale('coal'),
//         biomass, colorScale('biomass'),
//         waste, colorScale('waste'),
//         nuclear, colorScale('nuclear'),
//         geothermal, colorScale('geothermal'),
//         others, colorScale('others'), '#ffed6f'],
//       'circle-radius': 5
//     }
//   });

//     map.addLayer({
//       'id': 'powerplant_individual_outer',
//       'type': 'circle',
//       'source': 'permit',
//       'filter': ['!=', ['get', 'cluster'], true],
//       'paint': {
//         'circle-stroke-color': ['case',
//           hydro, colorScale('hydro'),
//           solar, colorScale('solar'),
//           wind, colorScale('wind'),
//           gas, colorScale('gas'),
//           oil, colorScale('oil'),
//           coal, colorScale('coal'),
//           biomass, colorScale('biomass'),
//           waste, colorScale('waste'),
//           nuclear, colorScale('nuclear'),
//           geothermal, colorScale('geothermal'),
//           others, colorScale('others'), '#ffed6f'],
//         'circle-stroke-width': 2,
//         'circle-radius': 10,
//         'circle-color': "rgba(0, 0, 0, 0)"
//       }
//     });



//     let markers = {};
//     let markersOnScreen = {};
//     let point_counts = [];
//     let totals;

//     const getPointCount = (features) => {
//       features.forEach(f => {
//         if (f.properties.cluster) {
//           point_counts.push(f.properties.point_count)
//         }
//       })

//       return point_counts;
//     };

//     const updateMarkers = () => {
//       document.getElementById('key').innerHTML = '';
//       let newMarkers = {};
//       const features = map.querySourceFeatures('permit');
//       totals = getPointCount(features);
//       features.forEach((feature) => {
//         const coordinates = feature.geometry.coordinates;
//         const props = feature.properties;

//         if (!props.cluster) {
//           return;
//         };


//         const id = props.cluster_id;

//         let marker = markers[id];
//         if (!marker) {
//           const el = createDonutChart(props, totals);
//           marker = markers[id] = new mapboxgl.Marker({
//             element: el
//           })
//           .setLngLat(coordinates)
//         }

//         newMarkers[id] = marker;

//         if (!markersOnScreen[id]) {
//           marker.addTo(map);
//         }
//       });

//       for (id in markersOnScreen) {
//         if (!newMarkers[id]) {
//           markersOnScreen[id].remove();
//         }
//       }
//         markersOnScreen = newMarkers;
//     };

//     const createDonutChart = (props, totals) => {
//       const div = document.createElement('div');
//       const data = [
//         {type: 'hydro', count: props.hydro},
//         {type: 'solar', count: props.solar},
//         {type: 'wind', count: props.wind},
//         {type: 'oil', count: props.oil},
//         {type: 'gas', count: props.gas},
//         {type: 'coal', count: props.coal},
//         {type: 'biomass', count: props.biomass},
//         {type: 'waste', count: props.waste},
//         {type: 'nuclear', count: props.nuclear},
//         {type: 'geothermal', count: props.geothermal},
//         {type: 'others', count: props.others},
//       ];

//       const thickness = 10;
//       const scale = d3.scaleLinear()
//         .domain([d3.min(totals), d3.max(totals)])
//         .range([500, d3.max(totals)])

//       const radius = Math.sqrt(scale(props.point_count));
//       const circleRadius = radius - thickness;

//       const svg = d3.select(div)
//         .append('svg')
//         .attr('class', 'pie')
//         .attr('width', radius * 2)
//         .attr('height', radius * 2);

//       //center
//       const g = svg.append('g')
//         .attr('transform', `translate(${radius}, ${radius})`);

//       const arc = d3.arc()
//         .innerRadius(radius - thickness)
//         .outerRadius(radius);

//       const pie = d3.pie()
//         .value(d => d.count)
//         .sort(null);

//       const path = g.selectAll('path')
//         .data(pie(data.sort((x, y) => d3.ascending(y.count, x.count))))
//         .enter()
//         .append('path')
//         .attr('d', arc)
//         .attr('fill', (d) => colorScale(d.data.type))

//       const circle = g.append('circle')
//         .attr('r', circleRadius)
//         .attr('fill', 'rgba(0, 0, 0, 0.7)')
//         .attr('class', 'center-circle')

//       const text = g
//         .append("text")
//         .attr("class", "total")
//         .text(props.point_count_abbreviated)
//         .attr('text-anchor', 'middle')
//         .attr('dy', 5)
//         .attr('fill', 'white')

//         const infoEl = createTable(props);

//         svg.on('click', () => {
//           d3.selectAll('.center-circle').attr('fill', 'rgba(0, 0, 0, 0.7)')
//           circle.attr('fill', 'rgb(71, 79, 102)')
//           document.getElementById('key').innerHTML = '';
//           document.getElementById('key').append(infoEl);
//         })

//       return div;
//     }

//     const createTable = (props) => {
//       const getPerc = (count) => {
//         return count/props.point_count;
//       };

//       const data = [
//         {type: 'hydro', perc: getPerc(props.hydro)},
//         {type: 'solar', perc: getPerc(props.solar)},
//         {type: 'wind', perc: getPerc(props.wind)},
//         {type: 'oil', perc: getPerc(props.oil)},
//         {type: 'gas', perc: getPerc(props.gas)},
//         {type: 'coal', perc: getPerc(props.coal)},
//         {type: 'biomass', perc: getPerc(props.biomass)},
//         {type: 'waste', perc: getPerc(props.waste)},
//         {type: 'nuclear', perc: getPerc(props.nuclear)},
//         {type: 'geothermal', perc: getPerc(props.geothermal)},
//         {type: 'others', perc: getPerc(props.others)},
//       ];

//       const columns = ['type', 'perc']
//       const div = document.createElement('div');
//       const table = d3.select(div).append('table').attr('class', 'table')
//   		const thead = table.append('thead')
//   		const	tbody = table.append('tbody');

//   		thead.append('tr')
//   		  .selectAll('th')
//   		  .data(columns).enter()
//   		  .append('th')
// 		    .text((d) => {
//           let colName = d === 'perc' ? '' : 'Risk Score'
//           return colName;
//         })

//   		const rows = tbody.selectAll('tr')
//   		  .data(data.filter(i => i.perc).sort((x, y) => d3.descending(x.perc, y.perc)))
//   		  .enter()
//   		  .append('tr')
//         .style('border-left', (d) => `20px solid ${colorScale(d.type)}`);

//   		// create a cell in each row for each column
//   		const cells = rows.selectAll('td')
//   		  .data((row) => {
//   		    return columns.map((column) => {
//             let val = column === 'perc' ? d3.format(".2%")(row[column]) : row[column];
//   		      return {column: column, value: val};
//   		    });
//   		  })
//   		  .enter()
//   		  .append('td')
// 		    .text((d) => d.value)
//         .style('text-transform', 'capitalize')

//   	  return div;
//     }

//     map.on('data', (e) => {
//       if (e.sourceId !== 'permit' || !e.isSourceLoaded) return;

//       map.on('move', updateMarkers);
//       map.on('moveend', updateMarkers);
//       updateMarkers();
//     });
// });
