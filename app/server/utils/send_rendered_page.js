'use strict';

let ejs = require('ejs');
let fs = require('fs');
let settings = require('../settings');
let utils = require('.');

exports.send = function(res, page_name, items, next){

 let file_path = settings.templatesPath + page_name;

 fs.readFile(file_path, 'utf8', function(err, data){
     if(err){
         next(err);
     }
    res.writeHead(200, {'Content-Type': 'text/html'});
     try {
         let rendered_data = ejs.render(data, items);
         res.write(rendered_data);
         res.end();
     }catch(err){
         utils.send_error_json(res, 500, 'Render error!');
     }

 })

};