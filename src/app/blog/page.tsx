import Link from 'next/link';
import Image from 'next/image';

const blogPosts = [
  {
    slug: 'ai-in-development',
    title: 'Leveraging AI in Modern Software Development',
    excerpt: 'Discover how AI tools are transforming the development workflow and boosting productivity in the fast-paced tech industry.',
    date: 'March 15, 2024',
    readTime: '8 min read',
    category: 'Development',
    image: '/blog/ai-development.jpg'
  },
  {
    slug: 'create-react-app-deprecated',
    title: 'Why Create React App is Being Deprecated',
    excerpt: 'Understanding the reasons behind Create React App\'s deprecation and exploring modern alternatives for React development.',
    date: 'March 16, 2024',
    readTime: '6 min read',
    category: 'React',
    image: '/blog/cra-deprecated.png'
  }
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#0a192f] py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-[#b5e0ff] mb-4">Blog</h1>
        <p className="text-gray-400 mb-12 max-w-2xl">Insights and thoughts on software development, technology trends, and best practices.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <Link 
              href={`/blog/${post.slug}`} 
              key={post.slug}
              className="group bg-[#112240] rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-[#1d2d50] hover:border-blue-500"
            >
              <div className="relative h-48 w-full">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#112240] to-transparent opacity-60" />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-3">
                  <span className="px-3 py-1 text-sm text-blue-400 bg-blue-400/10 rounded-full">{post.category}</span>
                  <span className="text-sm text-gray-400">{post.date}</span>
                </div>
                <h2 className="text-xl font-semibold text-[#b5e0ff] mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                  {post.title}
                </h2>
                <p className="text-gray-400 mb-4 line-clamp-3">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-[#1d2d50]">
                  <span className="text-sm text-gray-500">{post.readTime}</span>
                  <span className="text-blue-400 group-hover:translate-x-1 transition-transform inline-flex items-center">
                    Read more <span className="ml-1">→</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
} 