function run() {
	for (var i = 0; i< 60000; i++) {
		postMessage(i);
	}
}

run();