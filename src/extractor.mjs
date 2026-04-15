// extractor.mjs
import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';

export async function runExtraction({
    folder,
    patterns = ['**/*.*'],
    exclusions = [],
    outTxtPath,
    outMdPath,
    tokenLimit
}) {
    if (!folder) throw new Error('No file or folder selected');

    // for check if single file or folder
    const stat = await fs.promises.stat(folder);
    const isDir = stat.isDirectory();
    
    // base directory for path tree
    const baseDir = isDir ? folder : path.dirname(folder);

    // define exceptions
    const baseIgnore = [
        '**/node_modules/**', '**/.git/**', '**/.env/**', '**/dist/**', '**/build/**',
        '**/*.lock', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.webp',
        '**/*.svg', '**/*.mp4', '**/*.mp3', '**/*.woff', '**/*.ttf', '**/README.md'
    ];

    const userIgnore = exclusions.map(e => e.includes('.') ? `**/${e}` : `**/${e}/**`);
    const ignore = [...new Set([...baseIgnore, ...userIgnore])];

    const MAX_FILE_SIZE = 500_000; // ~500 KB per file
    const MAX_TOTAL_SIZE = 1_000_000; // ~1 MB total
    const avgCharsPerToken = 4;
    const maxChars = tokenLimit ? tokenLimit * avgCharsPerToken : Infinity;

    // search file or use single file
    let entries = [];
    if (isDir) {
        entries = await fg(patterns, {
            cwd: folder,
            ignore,
            absolute: true,
            dot: true,
            stats: true 
        });
    } else {
        // if single file create the entry object manually
        entries = [{ path: folder, stats: stat }];
    }

    const limitedFiles = [];
    let totalSize = 0;

    // apply size limit
    for (const entry of entries) {
        if (entry.stats.size > MAX_FILE_SIZE) continue;
        if (totalSize + entry.stats.size > MAX_TOTAL_SIZE) break;
        
        totalSize += entry.stats.size;
        limitedFiles.push(entry.path);
    }

    const treeStr = renderTree(buildTree(limitedFiles));

    // read file
    let mdContent = '';
    let txtContent = '';

    for (const file of limitedFiles) {
        const rel = path.relative(baseDir, file);
        let code;
        
        try { 
            code = await fs.promises.readFile(file, 'utf-8'); 
        } catch { 
            continue;
        }

        const mdBlock = `\n// ${rel}\n\`\`\`${getLang(file)}\n${code}\n\`\`\`\n`;
        const txtBlock = `=== FILE: ${rel} ===\n${code}\n\n`;

        // check token limit
        if (mdContent.length + mdBlock.length > maxChars) {
            const warn = '\n\n⚠️ REACHED TOKEN LIMIT\n';
            mdContent += warn;
            txtContent += warn;
            break; 
        }

        mdContent += mdBlock;
        txtContent += txtBlock;
    }

    // extract file
    if (outMdPath) {
        const finalMd = `## PROJECT STRUCTURE\n\`\`\`\n${treeStr}\n\`\`\`\n\n## SOURCE CODE\n${mdContent}`;
        fs.writeFileSync(outMdPath, finalMd, 'utf8');
    }

    if (outTxtPath) {
        const finalTxt = `=== PROJECT STRUCTURE ===\n\n${treeStr}\n\n=== SOURCE CODE ===\n\n${txtContent}`;
        fs.writeFileSync(outTxtPath, finalTxt, 'utf8');
    }

    return {
        files: limitedFiles.length,
        checkedFiles: entries.map(e => e.path),
        matchedPatterns: patterns
    };

    // Helpers

    function getLang(file) {
        const ext = file.split('.').pop();
        const map = {
            js: 'js', mjs: 'js', cjs: 'js', ts: 'ts', jsx: 'jsx', tsx: 'tsx',
            html: 'html', css: 'css', scss: 'scss', less: 'less', json: 'json',
            md: 'md', py: 'python', java: 'java', cs: 'csharp', cpp: 'cpp',
            c: 'c', rs: 'rust', go: 'go', php: 'php', swift: 'swift',
            sql: 'sql', xml: 'xml', yaml: 'yaml', yml: 'yaml'
        };
        return map[ext] || '';
    }

    function buildTree(files) {
        const tree = {};
        for (const file of files) {
            const rel = path.relative(baseDir, file);
            const parts = rel.split(path.sep);
            let current = tree;
            parts.forEach((part, i) => {
                if (!current[part]) current[part] = i === parts.length - 1 ? null : {};
                current = current[part];
            });
        }
        return tree;
    }

    function renderTree(obj, prefix = '') {
        let output = '';
        for (const key of Object.keys(obj)) {
            if (obj[key] === null) output += `${prefix}├── ${key}\n`;
            else {
                output += `${prefix}└── ${key}\n`;
                output += renderTree(obj[key], prefix + '│   ');
            }
        }
        return output;
    }
}