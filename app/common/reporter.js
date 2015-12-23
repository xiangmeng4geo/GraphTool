/**
 * 主要操作/app/config下文件（用户配置文件）
 */
!function(){
	var electron = require('electron');
	var crashReporter = electron.crashReporter;
	
	if (!global._reporter) {
		crashReporter.start({
			productName: 'testname',
			companyName: '华新创新网络',
			submitURL: 'http://10.14.85.116/php/crashreporter/',
			autoSubmit: true,
			ignoreSystemCrashHandler: true,
			extra: {
				content: 'tonny test',
				name: 'tonny'
			}
		});
		global._reporter = true;
	}		
}()
