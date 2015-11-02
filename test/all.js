var list = [
    './spec/test-util',
    './spec/test-product_conf',
    './spec/async/test-main',
    './spec/test-interpolate.idw',
    './spec/test-reader.micaps'
];

list.map(function(v){
    require(v);
});
