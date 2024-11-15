// 修改依赖检查函数
async function checkDependencies() {
    const dependencies = [
        { name: 'Tesseract', global: 'Tesseract' },
        { name: 'PDF.js', global: 'pdfjsLib' },
        { name: 'Mammoth', global: 'mammoth' },
        { name: 'XLSX', global: 'XLSX' },
        { name: 'JSZip', global: 'JSZip' }
    ];

    for (const dep of dependencies) {
        if (!window[dep.global]) {
            throw new Error(`${dep.name} 加载失败，请检查网络连接`);
        }
    }

    // 预加载 Tesseract 语言包
    try {
        const worker = await Tesseract.createWorker({
            logger: m => console.log('语言包加载进度:', m),
            langPath: 'https://cdn.bootcdn.net/ajax/libs/tesseract.js-lang/4.0.0'
        });
        await worker.loadLanguage('chi_sim+eng');
        await worker.terminate();
    } catch (error) {
        throw new Error(`语言包加载失败: ${error.message}`);
    }
}

// 修改初始化代码
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await checkDependencies();
        initializeUI();
    } catch (error) {
        showError(`初始化失败: ${error.message}`);
    }
});
