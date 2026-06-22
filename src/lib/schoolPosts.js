// Lightweight client-side store for school image posts with likes and comments
// Storage format: localStorage key 'school_posts_v1' => JSON array of posts
// Post: { id, author:{id,name}, image, caption, createdAt, likes:[userId], comments:[{id, author:{id,name}, text, createdAt}] }

const STORAGE_KEY = 'school_posts_v1';

function toStr(x){ try { return x==null? undefined : String(x); } catch{ return undefined; } }
export function getIdentifiersFromObj(obj={}){
  const cand = [obj.id, obj.user_id, obj.userId, obj.uid, obj.schoolId, obj.school_id, obj.email];
  const ids = cand.map(toStr).filter(Boolean);
  // unique
  return Array.from(new Set(ids));
}

export function loadPosts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function savePosts(posts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    try { window.dispatchEvent(new CustomEvent('school-posts-updated')); } catch {}
  } catch {}
}

export function createPost(author, image, caption) {
  const posts = loadPosts();
  const id = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
  const post = {
    id,
    author: { id: author?.id, name: author?.name || 'Escola', email: author?.email },
    authorIds: getIdentifiersFromObj(author),
    image,
    caption: caption || '',
    createdAt: new Date().toISOString(),
    likes: [],
    comments: []
  };
  posts.push(post);
  savePosts(posts);
  return post;
}

export function toggleLike(postId, userId) {
  const posts = loadPosts();
  const idx = posts.findIndex(p => p.id === postId);
  if (idx === -1) return;
  const likes = posts[idx].likes || [];
  const i = likes.indexOf(userId);
  if (i === -1) likes.push(userId); else likes.splice(i,1);
  posts[idx].likes = likes;
  savePosts(posts);
}

export function addComment(postId, author, text) {
  const posts = loadPosts();
  const idx = posts.findIndex(p => p.id === postId);
  if (idx === -1) return;
  const c = {
    id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2,5),
    author: { id: author?.id, name: author?.name || 'Usuário' },
    text,
    createdAt: new Date().toISOString()
  };
  posts[idx].comments = [...(posts[idx].comments || []), c];
  savePosts(posts);
  return c;
}

export function deletePost(postId) {
  const posts = loadPosts();
  const next = posts.filter(p => p.id !== postId);
  savePosts(next);
}
