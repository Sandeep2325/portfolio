import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import { use } from 'react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const blogPosts = {
  'ai-in-development': {
    title: 'Leveraging AI in Modern Software Development',
    // date: 'March 15, 2024',
    readTime: '8 min read',
    category: 'Development',
    image: '/blog/ai-development.jpg',
    content: `
      <h2>Introduction</h2>
      <p>In today's fast-paced tech industry, AI has become an indispensable tool for developers. From code completion to automated testing, AI is revolutionizing how we write and maintain software. This article explores practical ways to integrate AI into your development workflow.</p>

      <h2>1. Code Generation and Completion</h2>
      <p>Modern AI coding assistants like GitHub Copilot and Cursor have transformed the way we write code. These tools can:</p>
      <ul>
        <li>Generate boilerplate code and repetitive patterns</li>
        <li>Suggest function implementations based on comments</li>
        <li>Complete code snippets and provide context-aware suggestions</li>
        <li>Help with documentation and inline comments</li>
      </ul>

      <h2>2. Code Review and Quality Assurance</h2>
      <p>AI-powered tools can significantly improve code quality by:</p>
      <ul>
        <li>Automatically detecting potential bugs and security vulnerabilities</li>
        <li>Suggesting performance optimizations</li>
        <li>Enforcing coding standards and best practices</li>
        <li>Identifying code smells and technical debt</li>
      </ul>

      <h2>3. Testing and Debugging</h2>
      <p>AI can streamline the testing process through:</p>
      <ul>
        <li>Automated test case generation</li>
        <li>Intelligent test coverage analysis</li>
        <li>Predictive debugging suggestions</li>
        <li>Performance bottleneck identification</li>
      </ul>

      <h2>4. Documentation and Knowledge Management</h2>
      <p>AI tools can help maintain better documentation by:</p>
      <ul>
        <li>Generating API documentation from code</li>
        <li>Creating README files and project documentation</li>
        <li>Summarizing code changes and pull requests</li>
        <li>Answering questions about codebase architecture</li>
      </ul>

      <h2>5. Best Practices for AI Integration</h2>
      <p>To effectively use AI in development:</p>
      <ul>
        <li><strong>Always review AI-generated code before committing</strong></li>
        <li><strong>Use AI as a productivity enhancer, not a replacement for learning</strong></li>
        <li><strong>Keep security and privacy considerations in mind</strong></li>
        <li><strong>Stay updated with the latest AI tools and capabilities</strong></li>
      </ul>

      <h2>Conclusion</h2>
      <p>AI is not just a trend but a fundamental shift in how we approach software development. By embracing these tools while maintaining good development practices, we can significantly improve our productivity and code quality. The key is to use AI as a complement to human expertise, not a replacement for it.</p>
    `
  },
  'create-react-app-deprecated': {
    title: 'Why Create React App is Being Deprecated',
    // date: 'March 16, 2024',
    readTime: '6 min read',
    category: 'React',
    image: '/blog/cra-deprecated.png',
    content: `
    <h2>Introduction</h2>
    <p>Create React App (CRA) has been a cornerstone of React development since 2016, providing developers with a zero-configuration setup for building React applications. However, in recent times, the React team has announced its deprecation. Let's explore why this decision was made and what it means for the React ecosystem.</p>

    <h2>1. The Evolution of JavaScript Tooling</h2>
    <p>The JavaScript ecosystem has evolved significantly since CRA's inception:</p>
    <ul>
      <li>Modern bundlers like Vite and Turbopack offer significantly faster development experiences</li>
      <li>ESM (ECMAScript Modules) has become the standard for module systems</li>
      <li>New build tools provide better performance and developer experience</li>
      <li>TypeScript has become more prevalent in React projects</li>
    </ul>

    <h2>2. Performance Limitations</h2>
    <p>CRA's architecture has several performance bottlenecks:</p>
    <ul>
      <li>Slow development server startup times</li>
      <li>Inefficient hot module replacement (HMR)</li>
      <li>Heavy development dependencies</li>
      <li>Limited optimization options for production builds</li>
    </ul>

    <h2>3. Modern Alternatives</h2>
    <p>Several modern alternatives have emerged that address CRA's limitations:</p>
    <ul>
      <li><strong>Vite:</strong> Offers instant server start and hot module replacement</li>
      <li><strong>Next.js:</strong> Provides server-side rendering and static site generation</li>
      <li><strong>Remix:</strong> Focuses on web standards and progressive enhancement</li>
      <li><strong>Turbopack:</strong> Next-generation bundler with improved performance</li>
    </ul>

    <h2>4. Migration Path</h2>
    <p>For existing CRA projects, here are the recommended migration steps:</p>
    <ul>
      <li>Evaluate your project's specific needs and constraints</li>
      <li>Choose a modern framework based on your requirements</li>
      <li>Plan the migration process carefully</li>
      <li>Update dependencies and configurations</li>
      <li>Test thoroughly after migration</li>
    </ul>

    <h2>5. Future of React Development</h2>
    <p>The deprecation of CRA signals a shift towards:</p>
    <ul>
      <li>More specialized and optimized build tools</li>
      <li>Better developer experience</li>
      <li>Improved performance out of the box</li>
      <li>Enhanced support for modern web features</li>
    </ul>

    <h2>Conclusion</h2>
    <p>While Create React App served its purpose well, its deprecation represents the natural evolution of the React ecosystem. Modern alternatives offer better performance, developer experience, and features that align with current web development needs. As React developers, embracing these new tools will help us build better applications more efficiently.</p>
    `
  }
};

export default function BlogPost({ params }: PageProps) {
  const { slug } = use(params);
  const post = blogPosts[slug as keyof typeof blogPosts];
  
  if (!post) {
    return <div>Post not found</div>;
  }

  return (
    <div className="min-h-screen bg-[#0a192f] py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/blog"
          className="inline-flex items-center text-[#b5e0ff] hover:text-blue-400 mb-8 transition-colors group"
        >
          <FaArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Blog
        </Link>

        <article className="bg-[#112240] rounded-lg overflow-hidden shadow-xl border border-[#1d2d50]">
          <div className="relative h-80 w-full">
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#112240] to-transparent opacity-60" />
          </div>
          
          <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <span className="px-3 py-1 text-sm text-blue-400 bg-blue-400/10 rounded-full">{post.category}</span>
              {/* <span className="text-sm text-gray-400">{post.date}</span> */}
              <span className="text-sm text-gray-400">{post.readTime}</span>
            </div>

            <h1 className="text-4xl font-bold text-[#b5e0ff] mb-8 leading-tight">
              {post.title}
            </h1>

            <div 
              className="prose prose-invert max-w-none 
                prose-headings:text-[#b5e0ff] 
                prose-h1:text-4xl prose-h1:font-bold prose-h1:mb-8
                prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-12 prose-h2:mb-6 prose-h2:text-blue-400
                prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-4
                prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-6
                prose-strong:text-blue-400 prose-strong:font-semibold
                prose-ul:mt-6 prose-ul:mb-6
                prose-li:text-gray-300 prose-li:mb-2 prose-li:leading-relaxed
                prose-li:marker:text-blue-400 prose-li:marker:font-bold
                prose-a:text-blue-400 hover:prose-a:text-blue-300
                prose-blockquote:border-l-4 prose-blockquote:border-blue-400 prose-blockquote:pl-4 prose-blockquote:italic
                prose-code:text-blue-400 prose-code:bg-[#1d2d50] prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                prose-pre:bg-[#1d2d50] prose-pre:border prose-pre:border-[#2d3d60]"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>
        </article>
      </div>
    </div>
  );
} 