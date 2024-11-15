document.addEventListener('DOMContentLoaded', function() {
    try {
        checkDependencies();
        // ... 其他初始化代码
                } catch (error) {
        showError(`初始化失败: ${error.message}`);
    }
});

// 添加资源加载检查
function checkDependencies() {
    if (!window.Tesseract) {
        throw new Error('Tesseract.js 加载失败');
    }
    if (!window.pdfjsLib) {
        throw new Error('PDF.js 加载失败');
    }
    if (!window.mammoth) {
        throw new Error('Mammoth.js 加载失败');
    }
    if (!window.XLSX) {
        throw new Error('XLSX.js 加载失败');
    }
    if (!window.JSZip) {
        throw new Error('JSZip 加载失败');
    }
} 