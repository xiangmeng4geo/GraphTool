var list = [
    './spec/test-util',
    './spec/test-product_conf',
    './spec/test-interpolate.idw',
    './spec/test-reader.micaps',
    './spec/test-color',
    './spec/conrec/test-tool',
    './spec/conrec/test-tool-other',
    './spec/test-conrec'
];

list.map(function(v){
    require(v);
});
