// lib/posts.js
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

const postsDirectory = path.join(process.cwd(), 'posts');

export function getAllPosts() {
console.log('--- BẮT ĐẦU DEBUG ---');
  console.log('Đường dẫn thư mục gốc của project (process.cwd()):', process.cwd());
  console.log('Đang tìm kiếm bài viết trong thư mục:', postsDirectory);

  try {
    const fileNames = fs.readdirSync(postsDirectory);
    console.log('Đã tìm thấy các tệp sau:', fileNames); // Dòng này quan trọng nhất

    if (fileNames.length === 0) {
      console.warn('Cảnh báo: Không tìm thấy tệp nào trong thư mục "posts".');
    }
  // const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames.map((fileName) => {
    const slug = fileName.replace(/\.md$/, '');
    const fullPath = path.join(postsDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const matterResult = matter(fileContents);

    return {
      slug,
      ...matterResult.data, // title, date, description...
    };
  });

  // Sắp xếp bài viết theo ngày mới nhất
  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}catch (error){
        console.error('LỖI NGHIÊM TRỌNG: Không thể đọc thư mục "posts". Lỗi:', error.message);
        return []; // Trả về mảng rỗng để build không bị crash
    }
}

export async function getPostData(slug) {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const matterResult = matter(fileContents);

  // Chuyển markdown thành HTML
  const contentHtml = await marked(matterResult.content);

  return {
    slug,
    contentHtml,
    ...matterResult.data,
  };
}