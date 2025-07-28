#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function splitScrapboxJSON(inputFile, outputDir, numParts = 15) {
    console.log(`Reading ${inputFile}...`);
    
    // JSONファイルを読み込み
    const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
    
    if (!data.pages || !Array.isArray(data.pages)) {
        throw new Error('Invalid Scrapbox JSON format: pages array not found');
    }
    
    const totalPages = data.pages.length;
    const pagesPerPart = Math.ceil(totalPages / numParts);
    
    console.log(`Total pages: ${totalPages}`);
    console.log(`Pages per part: ${pagesPerPart}`);
    console.log(`Creating ${numParts} parts...`);
    
    // 出力ディレクトリを作成
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 各パートを作成
    for (let i = 0; i < numParts; i++) {
        const startIndex = i * pagesPerPart;
        const endIndex = Math.min(startIndex + pagesPerPart, totalPages);
        const partPages = data.pages.slice(startIndex, endIndex);
        
        if (partPages.length === 0) {
            console.log(`Part ${i + 1}: Skipping (no pages)`);
            continue;
        }
        
        // パートのJSONを作成
        const partData = {
            name: data.name,
            displayName: data.displayName,
            exported: data.exported,
            users: data.users,
            pages: partPages,
            partInfo: {
                partNumber: i + 1,
                totalParts: numParts,
                pagesInPart: partPages.length,
                pageRange: `${startIndex + 1}-${endIndex}`
            }
        };
        
        const outputFile = path.join(outputDir, `yoheitabo-part${i + 1}.json`);
        fs.writeFileSync(outputFile, JSON.stringify(partData, null, 2));
        
        console.log(`Part ${i + 1}: ${partPages.length} pages -> ${outputFile}`);
    }
    
    console.log('Split completed!');
}

// スクリプト実行
if (require.main === module) {
    const inputFile = process.argv[2] || './data/yoheitabo.json';
    const outputDir = process.argv[3] || './data/parts';
    const numParts = parseInt(process.argv[4]) || 15;
    
    try {
        splitScrapboxJSON(inputFile, outputDir, numParts);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

module.exports = { splitScrapboxJSON };