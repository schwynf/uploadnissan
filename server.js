const express = require("express");
const app = express();const fs = require('fs');
const axios = require("axios");
const cors = require('cors');
let cheerio = require('cheerio');

const PORT = process.env.PORT || 8080;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use(cors());

function csvToArray(str, delimiter = ",") {
    const headers = str.slice(0, str.indexOf("\n")).split(delimiter);

    const rows = str.slice(str.indexOf("\n") + 1).split("\n");

    const arr = rows.map(function (row) {
        const values = row.split(delimiter);
        const el = headers.reduce(function (object, header, index) {
        object[header] = values[index];
        return object;
        }, {});
        return el;
    });

    // return the array
    return arr;
}

function stringToNumber(percent){
    let include = [0,1,2,3,4,5,6,7,8,9,"."];
    let newPercent = "";
    for(let i = 0; i < percent.length; i++){
        for(let x = 0; x < include.length; x++){
            if(percent.charAt(i) == include[x]){
                newPercent += percent.charAt(i);
                break;
            }
        }
    }
    if(!parseFloat(newPercent)){
        return 0.00;
    }
    return parseFloat(newPercent).toFixed(2);
}

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

app.get('/api/nissaninfiniti/:partnumber', async (req, res) => {
    console.log(req.params.partnumber);
    let ob = {};
    if(req.params.partnumber){
        try {
            const response = await axios.get(`https://www.nissanpartsdeal.com/parts/nissan~${req.params.partnumber}.html`);
            const html = response.data;
            const $ = cheerio.load(html); 
            $('.price-section-retail').each(function(i, elem) {
                console.log("Nissan: " + $(this).find('span').text().trim())
                ob = {partnumber: req.params.partnumber, retailprice: stringToNumber($(this).find('span').text().trim())}
            });
        }catch(error) {
            // nissan-tip-guide
            try{
                const response = await axios.get(`https://www.nissanpartsdeal.com/parts/nissan-tip-guide~${req.params.partnumber}.html`);
                const html = response.data;
                const $ = cheerio.load(html); 
                $('.price-section-retail').each(function(i, elem) {
                    console.log("Nissan: " + $(this).find('span').text().trim())
                    ob = {partnumber: req.params.partnumber, retailprice: stringToNumber($(this).find('span').text().trim())}
                });
            }catch(error){
                try{
                    const response = await axios.get(`https://www.infinitipartsdeal.com/parts/infiniti~${req.params.partnumber}.html`);
                    const html = response.data;
                    const $ = cheerio.load(html); 
                    $('.price-section-retail').each(function(i, elem) {
                        console.log("Infiniti: " + $(this).find('span').text().trim())
                        ob = {partnumber: req.params.partnumber, retailprice: stringToNumber($(this).find('span').text().trim())}
                    });
                }catch(error){
                    console.log(error);
                    try{
                        const response = await axios.get(`https://www.infinitipartsdeal.com/parts/infiniti-tip-guide~${req.params.partnumber}.html`);
                        const html = response.data;
                        const $ = cheerio.load(html); 
                        $('.price-section-retail').each(function(i, elem) {
                            console.log("Infiniti: " + $(this).find('span').text().trim())
                            ob = {partnumber: req.params.partnumber, retailprice: stringToNumber($(this).find('span').text().trim())}
                        });
                    }catch(error){
                        console.log(error);
                    }
                }
            }
        }
    }
    res.json(ob)
});

app.get('/save', async (req, res) => {
    let ob = [['partnumber','price']];
    let csvContent = "data:text/csv;charset=utf-8,";
    fs.readFile('data.csv', 'utf8', async function (err, csv) {
        let dataArray = csvToArray(csv);
        for (let index = 0; index < dataArray.length; index++) {
            try {
                await sleep(150);
                const response = await axios.get(`https://www.nissanpartsdeal.com/parts/nissan~${dataArray[index]['partnumber']}.html`);
                const html = response.data;
                const $ = cheerio.load(html); 
                $('.price-section-retail').each(function(i, elem) {
                    console.log(index);
                    console.log($(this).find('span').text().trim())
                    ob.push([dataArray[index]['partnumber'],stringToNumber($(this).find('span').text().trim())])
                });
          }catch(error) {
              try{

                  await sleep(150);
                      const response = await axios.get(`https://www.nissanpartsdeal.com/parts/nissan~${dataArray[index]['partnumber']}.html`);
                      const html = response.data;
                      const $ = cheerio.load(html); 
                      $('.price-section-retail').each(function(i, elem) {
                          console.log(index);
                          console.log($(this).find('span').text().trim())
                          ob.push([dataArray[index]['partnumber'],stringToNumber($(this).find('span').text().trim())])
                      });
              }catch(error){
                console.log(error);
              }
          }
        };
        ob.forEach(function(rowArray) {
            let row = rowArray.join(",");
            csvContent += row + "\r\n";
            
        });
        console.log(ob);
        res.send(`<a href="${csvContent}">${csvContent}</a>`);
    });
});

app.get('/corscheck', async (req, res) => {
    const response = await axios.get(`https://uploadnissaninfiniti.herokuapp.com/api/nissaninfiniti/21741-JF00A`);
    console.log(response.data);
    if(response.data.partnumber){
        res.send(
            'API is Live!' + 
            '<br>' + 
            'API url: https://uploadnissaninfiniti.herokuapp.com/api/nissaninfiniti/21741-JF00A' +
            '<br>' +
            `Partnumber: ${response.data.partnumber}` +
            `<br>` + 
            `Price: ${response.data.retailprice}`
            )
    }else{
        res.send('API is Down! :(')
    }
});

app.get('/', async (req, res) => {
 res.send(
     'Welcome to the nissan/infiniti api!' + 
     '<br>' + 
     'Fast and Easy to use!' +
     '<br>' +
     'https://uploadnissaninfiniti.herokuapp.com/api/nissaninfiniti/:partnumber'
     )
});


app.listen(PORT, () => {
    console.log(`Server is listening ` + `http://localhost:${PORT}`)
});