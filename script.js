document.addEventListener('DOMContentLoaded', function() {
    // 获取所有 DOM 元素
    const fileInput = document.getElementById('fileInput');
    const uploadSection = document.querySelector('.upload-section');
    const resultSection = document.getElementById('resultSection');
    const resultContent = document.getElementById('resultContent');
    const progressContainer = document.getElementById('progressContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const useApiSelect = document.getElementById('useApi');
    const apiConfigSection = document.getElementById('apiConfigSection');
    const apiKeyInput = document.getElementById('apiKey');
    const apiModelSelect = document.getElementById('apiModel');
    const saveApiKeyBtn = document.getElementById('saveApiKey');
    let isProcessing = false;

    // 添加全局 worker 变量
    let currentWorker = null;

    // 初始化界面
    function initializeUI() {
        // 显示所有控制区域
        resultSection.style.display = 'block';
        document.querySelector('.format-controls').style.display = 'flex';
        document.querySelector('.action-controls').style.display = 'flex';
        
        // 隐藏进度相关元素
        progressContainer.style.display = 'none';
        loadingSpinner.style.display = 'none';

        // 初始化 API 配置
        const savedApiKey = localStorage.getItem('deepseekApiKey');
        if (savedApiKey) {
            apiKeyInput.value = savedApiKey;
            const savedModel = localStorage.getItem('deepseekModel');
            if (savedModel) {
                apiModelSelect.value = savedModel;
            }
        }

        // 绑定 API 相关事件
        useApiSelect.addEventListener('change', function() {
            apiConfigSection.style.display = this.value === 'yes' ? 'flex' : 'none';
            if (this.value === 'yes') {
                const savedApiKey = localStorage.getItem('deepseekApiKey');
                if (savedApiKey) {
                    apiKeyInput.value = savedApiKey;
                }
            }
        });

        // 绑定功能按钮事件
        document.getElementById('previewBtn').addEventListener('click', previewContent);
        document.getElementById('copyAll').addEventListener('click', copyAllContent);
        document.getElementById('downloadBtn').addEventListener('click', downloadContent);
        document.getElementById('compressBtn').addEventListener('click', compressAndDownload);

        // 绑定模态框关闭事件
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            const closeBtn = modal.querySelector('.close');
            if (closeBtn) {
                closeBtn.onclick = () => modal.style.display = 'none';
            }
            window.onclick = (event) => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            };
        });
    }

    // 调用初始化
    initializeUI();

    // 文件选择处理
    fileInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // 显示文件列表
        const fileList = files.map(file => 
            '<div class="selected-file">' +
                '<span>' + file.name + '</span>' +
                '<span>(' + (file.size / 1024 / 1024).toFixed(2) + ' MB)</span>' +
            '</div>'
        ).join('');

        resultContent.innerHTML = 
            '<div class="selected-files-container">' +
                '<h3>已选择的文件：</h3>' +
                fileList +
            '</div>';

        // 显示开始处理按钮
        const startButton = document.getElementById('startProcess');
        startButton.style.display = 'block';
        startButton.textContent = '处理 ' + files.length + ' 个文件';
        startButton.onclick = () => startProcessing(files);
    });

    // 开始处理文件
    async function startProcessing(files) {
        if (isProcessing) return;
        isProcessing = true;

        try {
            progressContainer.style.display = 'block';
            loadingSpinner.style.display = 'flex';

            for (let i = 0; i < files.length; i++) {
                if (!isProcessing) {
                    console.log('处理已被用户终止');
                    break;
                }

                const file = files[i];
                updateProgress(i, files.length, file.name);

                try {
                    const text = await processFile(file);
                    showResult(file.name, text);
                } catch (error) {
                    console.error(`处理文件 ${file.name} 失败:`, error);
                    showError(`处理文件 ${file.name} 时出错: ${error.message}`);
                    continue;
                }
            }
        } finally {
            isProcessing = false;
            progressContainer.style.display = 'none';
            loadingSpinner.style.display = 'none';
        }
    }

    // 更新进度显示
    function updateProgress(current, total, fileName) {
        const percent = Math.round((current / total) * 100);
        document.getElementById('currentFile').textContent = '正在处理: ' + fileName;
        document.getElementById('progressPercent').textContent = percent + '%';
        document.getElementById('progressFill').style.width = percent + '%';
        document.getElementById('batchProgress').textContent = 
            '已处理: ' + (current + 1) + '/' + total;
    }

    // 显示结果
    function showResult(fileName, text) {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-item';
        resultDiv.innerHTML = 
            '<h4>' + fileName + '</h4>' +
            '<pre>' + text + '</pre>';
        resultContent.appendChild(resultDiv);
    }

    // 显示错误信息
    function showError(message) {
        const errorModal = document.getElementById('errorModal');
        const errorMessage = document.getElementById('errorMessage');
        if (errorModal && errorMessage) {
            errorMessage.textContent = message;
            errorModal.style.display = 'block';
        } else {
            alert(message);
        }
    }

    // 功能按钮处理函数
    function previewContent() {
        const previewModal = document.getElementById('previewModal');
        const previewContent = document.getElementById('previewContent');
        previewContent.textContent = resultContent.innerText;
        previewModal.style.display = 'block';
    }

    function copyAllContent() {
        const text = resultContent.innerText;
        navigator.clipboard.writeText(text)
            .then(() => showSuccess('内容已复制到剪贴板！'))
            .catch(err => showError('复制失败: ' + err.message));
    }

    function downloadContent() {
        const text = resultContent.innerText;
        const format = document.getElementById('exportFormat').value;
        const fileName = '提取结果.' + (format === 'text' ? 'txt' : format);
        
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 显示成功消息
    function showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        document.querySelector('.controls').appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 3000);
    }

    // 添���压缩下载功能
    async function compressAndDownload() {
        try {
            // 创建新的 JSZip 实例
            const zip = new JSZip();
            const text = resultContent.innerText;
            const format = document.getElementById('exportFormat').value;
            const textFormat = document.getElementById('textFormat').value;

            // 根据格式添加文件
            if (format === 'text') {
                zip.file('取结果.txt', text);
            } else if (format === 'markdown') {
                zip.file('提取结果.md', text);
            } else if (format === 'html') {
                const html = `<!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <title>提取结果</title>
                        <style>
                            body { font-family: sans-serif; line-height: 1.6; padding: 20px; }
                            .page { margin-bottom: 20px; padding: 10px; border-bottom: 1px solid #eee; }
                        </style>
                    </head>
                    <body>${text}</body>
                    </html>`;
                zip.file('提取结果.html', html);
            } else if (format === 'json') {
                const json = {
                    content: text,
                    format: textFormat,
                    timestamp: new Date().toISOString()
                };
                zip.file('提取结果.json', JSON.stringify(json, null, 2));
            }

            // 生成压缩文件
            const content = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: 9
                }
            });

            // 下载压缩文件
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = '提取结果.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // 显示成功消息
            showSuccess('文件已压缩并开始下载！');

        } catch (error) {
            console.error('压缩下载失败:', error);
            showError('压缩下载失败: ' + error.message);
        }
    }

    // 文件处理函数
    async function processFile(file) {
        try {
            // 根据文件类型选择处理方法
            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                return await processPDF(file).catch(error => {
                    console.error('PDF 处理错误:', error);
                    throw new Error(`PDF 处理失败: ${error.message}`);
                });
            } else if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif)$/i.test(file.name)) {
                return await processImage(file).catch(error => {
                    console.error('图片处理错误:', error);
                    throw new Error(`图片处理失败: ${error.message}`);
                });
            } else if (/\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(file.name)) {
                return await processOfficeDoc(file).catch(error => {
                    console.error('Office 文档处理错误:', error);
                    throw new Error(`Office 文档处理失败: ${error.message}`);
                });
            } else {
                throw new Error('不支持的文件类型');
            }
        } catch (error) {
            console.error('文件处理错误:', error);
            throw error;
        }
    }

    // PDF 处理函数
    async function processPDF(file) {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js';
        
        try {
            // 创建实时预览容器
            const previewContainer = document.createElement('div');
            previewContainer.className = 'preview-container';
            resultContent.innerHTML = ''; // 清空之前的内容
            resultContent.appendChild(previewContainer);

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            // 为每一页创建预览区域
            for (let i = 1; i <= pdf.numPages; i++) {
                const pagePreview = document.createElement('div');
                pagePreview.className = 'page-preview';
                pagePreview.innerHTML = `
                    <div class="page-header">
                        <h3>第 ${i} 页</h3>
                        <div class="progress-indicator">处理中...</div>
                    </div>
                    <div class="page-content">
                        <div class="text-content"></div>
                        <div class="image-content"></div>
                    </div>
                `;
                previewContainer.appendChild(pagePreview);
            }

            // 创建 OCR worker
            try {
                if (currentWorker) {
                    await currentWorker.terminate();
                }
                
                currentWorker = await Tesseract.createWorker({
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            document.getElementById('processingStatus').textContent = 
                                `正在识别文字 ${Math.round(m.progress * 100)}%`;
                        }
                    },
                    workerPath: 'https://unpkg.com/tesseract.js@v4.1.1/dist/worker.min.js',
                    corePath: 'https://unpkg.com/tesseract.js-core@v4.0.4/tesseract-core.wasm.js',
                    langPath: 'https://raw.githubusercontent.com/naptha/tessdata/4.0.0'
                });

                await currentWorker.loadLanguage(document.getElementById('language').value);
                await currentWorker.initialize(document.getElementById('language').value);

                // 处理每一页
                for (let i = 1; i <= pdf.numPages; i++) {
                    try {
                        const page = await pdf.getPage(i);
                        const pagePreview = previewContainer.querySelector(`.page-preview:nth-child(${i})`);
                        
                        // 获取并显示文本内容
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        pagePreview.querySelector('.text-content').textContent = pageText;

                        // 渲染页到 canvas
                        const renderScale = 2.0;
                        const viewport = page.getViewport({ scale: renderScale });
                        const canvas = document.createElement('canvas');
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        const context = canvas.getContext('2d', {
                            alpha: false,
                            willReadFrequently: true,
                            imageSmoothingEnabled: true,
                            imageSmoothingQuality: 'high'
                        });

                        // 使用白色背景
                        context.fillStyle = 'white';
                        context.fillRect(0, 0, canvas.width, canvas.height);

                        await page.render({
                            canvasContext: context,
                            viewport: viewport,
                            intent: 'print',
                            background: 'white'
                        }).promise;

                        // 应用图像处理
                        const processedCanvas = await advancedProcessing.enhanceImage(canvas);

                        // OCR 识别
                        const { data: { text: imageText, confidence } } = await currentWorker.recognize(processedCanvas);
                        
                        // 如果启用了 API 优化，使用 DeepSeek 优化文本
                        let finalText = imageText;
                        if (useApiSelect.value === 'yes') {
                            const improvedText = await improveTextWithDeepSeek(imageText);
                            if (improvedText && improvedText !== imageText) {
                                finalText = improvedText;
                                pagePreview.querySelector('.image-content').innerHTML = `
                                    <div class="image-text-header">图片文字内容 (置信度: ${confidence.toFixed(2)}%):</div>
                                    <div class="image-text-content">
                                        <div class="original-text">
                                            <h4>原始文本：</h4>
                                            <pre>${imageText}</pre>
                                        </div>
                                        <div class="improved-text">
                                            <h4>优化后文本：</h4>
                                            <pre>${improvedText}</pre>
                                        </div>
                                    </div>
                                `;
                            } else {
                                pagePreview.querySelector('.image-content').innerHTML = `
                                    <div class="image-text-header">图片文字内容 (置信度: ${confidence.toFixed(2)}%):</div>
                                    <div class="image-text-content">${imageText}</div>
                                `;
                            }
                        } else {
                            pagePreview.querySelector('.image-content').innerHTML = `
                                <div class="image-text-header">图片文字内容 (置信度: ${confidence.toFixed(2)}%):</div>
                                <div class="image-text-content">${imageText}</div>
                            `;
                        }

                        pagePreview.querySelector('.progress-indicator').textContent = '完成';
                        pagePreview.querySelector('.progress-indicator').className = 'progress-indicator complete';

                        // 清理内存
                        canvas.width = 0;
                        canvas.height = 0;

                        // 更新进度
                        const progress = (i / pdf.numPages) * 100;
                        document.getElementById('progressPercent').textContent = `${Math.round(progress)}%`;
                        document.getElementById('progressFill').style.width = `${progress}%`;
                        document.getElementById('processingStatus').textContent = 
                            `正在处理第 ${i}/${pdf.numPages} 页...`;

                        // 滚动到最新内容
                        pagePreview.scrollIntoView({ behavior: 'smooth', block: 'end' });

                    } catch (pageError) {
                        console.warn(`处理第 ${i} 页时出错:`, pageError);
                        const pagePreview = previewContainer.querySelector(`.page-preview:nth-child(${i})`);
                        if (pagePreview) {
                            pagePreview.querySelector('.progress-indicator').textContent = '处理失败';
                            pagePreview.querySelector('.progress-indicator').className = 'progress-indicator error';
                        }
                    }
                }

            } finally {
                if (currentWorker) {
                    await currentWorker.terminate();
                    currentWorker = null;
                }
            }

            return previewContainer.innerHTML;

        } catch (error) {
            if (currentWorker) {
                await currentWorker.terminate();
                currentWorker = null;
            }
            throw error;
        }
    }

    // 添加图像预处理函数
    async function preprocessImage(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // 1. 转换为灰度图
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            data[i] = data[i + 1] = data[i + 2] = avg;
        }

        // 2. 自适应二值化
        const windowSize = 15;
        const C = 5;
        
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                let sum = 0;
                let count = 0;
                
                // 计算局部窗口平均值
                for (let wy = Math.max(0, y - windowSize); wy < Math.min(canvas.height, y + windowSize); wy++) {
                    for (let wx = Math.max(0, x - windowSize); wx < Math.min(canvas.width, x + windowSize); wx++) {
                        sum += data[(wy * canvas.width + wx) * 4];
                        count++;
                    }
                }
                
                const threshold = (sum / count) - C;
                const idx = (y * canvas.width + x) * 4;
                const value = data[idx] < threshold ? 0 : 255;
                data[idx] = data[idx + 1] = data[idx + 2] = value;
            }
        }

        // 3. 降噪
        const tempData = new Uint8ClampedArray(data);
        for (let y = 1; y < canvas.height - 1; y++) {
            for (let x = 1; x < canvas.width - 1; x++) {
                const idx = (y * canvas.width + x) * 4;
                let blackCount = 0;
                
                // 检查8邻域
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nidx = ((y + dy) * canvas.width + (x + dx)) * 4;
                        if (tempData[nidx] === 0) blackCount++;
                    }
                }
                
                // 如果黑色像素太少，认为是噪点
                if (blackCount < 2) {
                    data[idx] = data[idx + 1] = data[idx + 2] = 255;
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    // 图片处理函数
    async function processImage(file) {
        try {
            currentWorker = await Tesseract.createWorker({
                logger: m => {
                    if (m.status === 'recognizing text') {
                        document.getElementById('processingStatus').textContent = 
                            `正在识别文字 ${Math.round(m.progress * 100)}%`;
                    }
                },
                langPath: 'https://raw.githubusercontent.com/naptha/tessdata/4.0.0'
            });

            await currentWorker.loadLanguage(document.getElementById('language').value);
            await currentWorker.initialize(document.getElementById('language').value);

            const imageUrl = URL.createObjectURL(file);
            const { data: { text } } = await currentWorker.recognize(imageUrl);

            await currentWorker.terminate();
            currentWorker = null;
            URL.revokeObjectURL(imageUrl);

            return text;
        } catch (error) {
            if (currentWorker) {
                await currentWorker.terminate();
                currentWorker = null;
            }
            throw new Error(`图片处理失败: ${error.message}`);
        }
    }

    // Office 文档处理函数
    async function processOfficeDoc(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            
            if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
                const result = await mammoth.extractRawText({ arrayBuffer });
                return result.value;
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                const workbook = XLSX.read(arrayBuffer);
                let text = '';
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    text += `${sheetName}:\n${XLSX.utils.sheet_to_txt(sheet)}\n\n`;
                });
                return text;
            } else if (file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) {
                const result = await mammoth.extractRawText({ arrayBuffer });
                return result.value;
            }
            
            throw new Error('不支持的文件类型');
        } catch (error) {
            throw new Error(`Office文档处理失败: ${error.message}`);
        }
    }

    // 添加终止按钮事件监听
    const cancelButton = document.getElementById('cancelProcess');
    cancelButton.addEventListener('click', async () => {
        if (isProcessing) {
            try {
                // 设置终止标志
                isProcessing = false;
                
                // 显示终止状态
                document.getElementById('processingStatus').textContent = '正在终止处理...';
                
                // 终止当前 worker
                if (currentWorker) {
                    await currentWorker.terminate();
                    currentWorker = null;
                }
                
                // 清空文件队列
                fileInput.value = '';
                selectedFiles = [];
                
                // 重置界面
                progressContainer.style.display = 'none';
                loadingSpinner.style.display = 'none';
                document.getElementById('startProcess').style.display = 'none';
                
                // 显示终止消息
                showSuccess('处理已终止');
                
            } catch (error) {
                console.error('终止处理时出错:', error);
                showError('终止处理时出错: ' + error.message);
            }
        }
    });

    // 修改终止按钮样式
    const buttonDanger = document.querySelector('.button-danger');
    if (buttonDanger) {
        buttonDanger.style.backgroundColor = '#FF3B30';
        buttonDanger.style.color = 'white';
        buttonDanger.addEventListener('mouseover', function() {
            this.style.backgroundColor = '#FF2D55';
        });
        buttonDanger.addEventListener('mouseout', function() {
            this.style.backgroundColor = '#FF3B30';
        });
    }

    // 添加所有样式（合并之前的两个style声明）
    const style = document.createElement('style');
    style.textContent = `
        .button-danger {
            background-color: #FF3B30;
            color: white;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
        }

        .button-danger:hover {
            background-color: #FF2D55;
            transform: translateY(-1px);
        }

        .button-danger svg {
            width: 16px;
            height: 16px;
        }

        .success-message {
            color: #34C759;
            background: #34C75915;
            padding: 8px 12px;
            border-radius: 6px;
            margin-top: 8px;
            animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .original-text, .improved-text {
            margin: 10px 0;
            padding: 10px;
            border-radius: 6px;
        }

        .original-text {
            background: #F5F5F7;
        }

        .improved-text {
            background: #E8F5E9;
        }

        .original-text h4, .improved-text h4 {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: var(--text-color);
        }

        .improved-text pre {
            color: #2E7D32;
        }
    `;
    document.head.appendChild(style);

    // API 保存按钮点击事件
    saveApiKeyBtn.addEventListener('click', async function() {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            showError('请输入 API Key');
            return;
        }

        try {
            // 显示保存中状态
            saveApiKeyBtn.disabled = true;
            saveApiKeyBtn.textContent = '保存中...';

            // 测试 API 连接
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: apiModelSelect.value,
                    messages: [{ role: "user", content: "测试连接" }]
                })
            });

            if (!response.ok) {
                throw new Error('API 连接测试失败');
            }

            // 保存配置
            localStorage.setItem('deepseekApiKey', apiKey);
            localStorage.setItem('deepseekModel', apiModelSelect.value);

            // 显示成功消息
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.textContent = 'API 配置已保存！';
            apiConfigSection.appendChild(successMessage);

            // 3秒后移除成功消息
            setTimeout(() => {
                successMessage.remove();
            }, 3000);

            // 启用文件上传
            fileInput.disabled = false;

        } catch (error) {
            console.error('API 配置失败:', error);
            showError('API 配置失败: ' + error.message);
        } finally {
            // 恢复按钮状态
            saveApiKeyBtn.disabled = false;
            saveApiKeyBtn.textContent = '保存 API 配置';
        }
    });

    // 初始化时检查 API 配置
    const savedApiKey = localStorage.getItem('deepseekApiKey');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
        const savedModel = localStorage.getItem('deepseekModel');
        if (savedModel) {
            apiModelSelect.value = savedModel;
        }
    }

    // 添加高级图像处理和 OCR 优化
    const advancedProcessing = {
        // 图像预处理优化
        async enhanceImage(canvas) {
            const ctx = canvas.getContext('2d');
            let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // 1. 去噪和锐化
            imageData = await this.denoise(imageData);
            imageData = await this.sharpen(imageData);
            
            // 2. 对比度增强
            imageData = await this.enhanceContrast(imageData);
            
            // 3. 二值化
            imageData = await this.binarize(imageData);
            
            ctx.putImageData(imageData, 0, 0);
            return canvas;
        },

        // 高斯去噪
        async denoise(imageData) {
            const { data, width, height } = imageData;
            const output = new Uint8ClampedArray(data);
            const radius = 1;
            const sigma = 1.4;
            
            const kernel = this.createGaussianKernel(radius, sigma);
            
            for (let y = radius; y < height - radius; y++) {
                for (let x = radius; x < width - radius; x++) {
                    let r = 0, g = 0, b = 0;
                    let weightSum = 0;
                    
                    for (let ky = -radius; ky <= radius; ky++) {
                        for (let kx = -radius; kx <= radius; kx++) {
                            const weight = kernel[ky + radius][kx + radius];
                            const idx = ((y + ky) * width + (x + kx)) * 4;
                            
                            r += data[idx] * weight;
                            g += data[idx + 1] * weight;
                            b += data[idx + 2] * weight;
                            weightSum += weight;
                        }
                    }
                        
                    const outIdx = (y * width + x) * 4;
                    output[outIdx] = r / weightSum;
                    output[outIdx + 1] = g / weightSum;
                    output[outIdx + 2] = b / weightSum;
                    output[outIdx + 3] = data[outIdx + 3];
                }
            }
            
            return new ImageData(output, width, height);
        },

        // 创建高斯核
        createGaussianKernel(radius, sigma) {
            const size = 2 * radius + 1;
            const kernel = Array(size).fill().map(() => Array(size).fill(0));
            let sum = 0;
            
            for (let y = -radius; y <= radius; y++) {
                for (let x = -radius; x <= radius; x++) {
                    const value = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
                    kernel[y + radius][x + radius] = value;
                    sum += value;
                }
            }
            
            // 归一化
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    kernel[y][x] /= sum;
                }
            }
            
            return kernel;
        },

        // 锐化
        async sharpen(imageData) {
            const { data, width, height } = imageData;
            const output = new Uint8ClampedArray(data);
            const kernel = [
                0, -1, 0,
                -1, 5, -1,
                0, -1, 0
            ];
            
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    let r = 0, g = 0, b = 0;
                    
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4;
                            const kIdx = (ky + 1) * 3 + (kx + 1);
                            
                            r += data[idx] * kernel[kIdx];
                            g += data[idx + 1] * kernel[kIdx];
                            b += data[idx + 2] * kernel[kIdx];
                        }
                    }
                        
                    const outIdx = (y * width + x) * 4;
                    output[outIdx] = Math.max(0, Math.min(255, r));
                    output[outIdx + 1] = Math.max(0, Math.min(255, g));
                    output[outIdx + 2] = Math.max(0, Math.min(255, b));
                    output[outIdx + 3] = data[outIdx + 3];
                }
            }
            
            return new ImageData(output, width, height);
        },

        // 自适应对比度增强
        async enhanceContrast(imageData) {
            const { data, width, height } = imageData;
            const output = new Uint8ClampedArray(data);
            const windowSize = 16;
            const maxContrast = 1.5;
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let sum = 0, count = 0;
                    
                    for (let wy = Math.max(0, y - windowSize); wy < Math.min(height, y + windowSize); wy++) {
                        for (let wx = Math.max(0, x - windowSize); wx < Math.min(width, x + windowSize); wx++) {
                            sum += data[(wy * width + wx) * 4];
                            count++;
                        }
                    }
                        
                    const mean = sum / count;
                    const idx = (y * width + x) * 4;
                    const diff = data[idx] - mean;
                    const newValue = mean + diff * maxContrast;
                    
                    output[idx] = output[idx + 1] = output[idx + 2] = 
                        Math.max(0, Math.min(255, newValue));
                    output[idx + 3] = data[idx + 3];
                }
            }
            
            return new ImageData(output, width, height);
        },

        // Otsu 自适应二值化
        async binarize(imageData) {
            const { data, width, height } = imageData;
            const output = new Uint8ClampedArray(data);
            const histogram = new Array(256).fill(0);
            
            // 计算直方图
            for (let i = 0; i < data.length; i += 4) {
                histogram[data[i]]++;
            }
            
            // 计算最佳阈值
            const total = width * height;
            let sumB = 0, wB = 0;
            let maximum = 0;
            let threshold = 0;
            const sum = histogram.reduce((acc, val, idx) => acc + val * idx, 0);
            
            for (let t = 0; t < 256; t++) {
                wB += histogram[t];
                if (wB === 0) continue;
                
                const wF = total - wB;
                if (wF === 0) break;
                
                sumB += t * histogram[t];
                const mB = sumB / wB;
                const mF = (sum - sumB) / wF;
                const between = wB * wF * (mB - mF) * (mB - mF);
                
                if (between > maximum) {
                    maximum = between;
                    threshold = t;
                }
            }
            
            // 应用二值化
            for (let i = 0; i < data.length; i += 4) {
                const value = data[i] < threshold ? 0 : 255;
                output[i] = output[i + 1] = output[i + 2] = value;
                output[i + 3] = data[i + 3];
            }
            
            return new ImageData(output, width, height);
        }
    };

    // 添加 DeepSeek API 文本优化函数
    async function improveTextWithDeepSeek(text) {
        try {
            const apiKey = localStorage.getItem('deepseekApiKey');
            if (!apiKey) {
                console.warn('未配置 DeepSeek API Key');
                return text;
            }

            const prompt = `请帮我修改和润色以下文本，修正错别字、标点符号，使语句更通顺自然，保持原意不变：\n\n${text}`;

            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: localStorage.getItem('deepseekModel') || "deepseek-chat",
                    messages: [
                        {
                            role: "system",
                            content: "你是一个专业的文字编辑，擅长修改和润色文本，纠正错别字和标点符号，使语句更通顺自然。请保持原文的主要内容和结构不变，只对表达方式进行优化。"
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.3, // 降低随机性，保持稳定输出
                    max_tokens: 4000,
                    top_p: 0.95,
                    frequency_penalty: 0.1,
                    presence_penalty: 0.1
                })
            });

            if (!response.ok) {
                throw new Error(`API 请求失败: ${response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('DeepSeek API 处理错误:', error);
            return text; // 如果 API 调用失败，返回原始文本
        }
    }
}); 