#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function analyzeKisokuTag() {
    const partsDir = './data/parts';
    const results = [];
    
    // 全ての分割ファイルを読み込み
    const files = fs.readdirSync(partsDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
        const filePath = path.join(partsDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        for (const page of data.pages) {
            // 既読タグを含むページを検索
            const hasKisokuTag = page.lines.some(line => 
                line.text && line.text.includes('#既読')
            );
            
            if (hasKisokuTag) {
                // タグを抽出
                const tags = [];
                const content = [];
                
                for (const line of page.lines) {
                    if (line.text) {
                        content.push(line.text);
                        
                        // ハッシュタグを抽出
                        const hashTags = line.text.match(/#[^\s#]+/g);
                        if (hashTags) {
                            tags.push(...hashTags);
                        }
                    }
                }
                
                results.push({
                    title: page.title,
                    created: new Date(page.created * 1000).toISOString().split('T')[0],
                    updated: new Date(page.updated * 1000).toISOString().split('T')[0],
                    tags: [...new Set(tags)], // 重複除去
                    contentLines: content.length,
                    firstLines: content.slice(0, 5), // 最初の5行
                    file: file
                });
            }
        }
    }
    
    // 結果を時系列順にソート（更新日時順）
    results.sort((a, b) => new Date(b.updated) - new Date(a.updated));
    
    return results;
}

function generateReport(results) {
    console.log('=== 既読タグ分析レポート ===\n');
    
    console.log(`総ページ数: ${results.length}ページ\n`);
    
    // タグの組み合わせ分析
    const tagCombinations = {};
    results.forEach(page => {
        const tagSet = page.tags.sort().join(' ');
        tagCombinations[tagSet] = (tagCombinations[tagSet] || 0) + 1;
    });
    
    console.log('== タグ組み合わせ ==');
    Object.entries(tagCombinations)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([tags, count]) => {
            console.log(`${count}回: ${tags}`);
        });
    
    console.log('\n== 年別分布 ==');
    const yearDistribution = {};
    results.forEach(page => {
        const year = page.updated.split('-')[0];
        yearDistribution[year] = (yearDistribution[year] || 0) + 1;
    });
    
    Object.entries(yearDistribution)
        .sort((a, b) => a[0] - b[0])
        .forEach(([year, count]) => {
            console.log(`${year}年: ${count}ページ`);
        });
    
    console.log('\n== 最近の既読ページ（上位10件） ==');
    results.slice(0, 10).forEach((page, index) => {
        console.log(`${index + 1}. ${page.title}`);
        console.log(`   更新: ${page.updated}`);
        console.log(`   タグ: ${page.tags.join(' ')}`);
        console.log(`   内容: ${page.firstLines[0] || '(内容なし)'}`);
        console.log('');
    });
    
    return results;
}

// スクリプト実行
if (require.main === module) {
    try {
        const results = analyzeKisokuTag();
        generateReport(results);
        
        // 詳細結果をJSONファイルに保存
        fs.writeFileSync('./kisoku-analysis-results.json', JSON.stringify(results, null, 2));
        console.log('詳細結果を kisoku-analysis-results.json に保存しました。');
        
    } catch (error) {
        console.error('エラー:', error.message);
        process.exit(1);
    }
}

module.exports = { analyzeKisokuTag, generateReport };