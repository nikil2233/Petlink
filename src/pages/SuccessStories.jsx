import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Camera, PenTool, X, Send, Award, Calendar, Trash2, Star, Sparkles, BadgeCheck } from 'lucide-react';
import { AnimatedDog, AnimatedCat, AnimatedParrot } from '../components/AnimatedPets';

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80"
];

export default function SuccessStories() {
  const { user, role, profile } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Comments State
  const [activeStoryId, setActiveStoryId] = useState(null); // Which story's comments are open
  const [comments, setComments] = useState({}); // { storyId: [comment1, comment2] }
  const [commentInputs, setCommentInputs] = useState({}); // { storyId: "draft text" }
  const [loadingComments, setLoadingComments] = useState(false);

  // Likes State
  const [userLikes, setUserLikes] = useState(new Set()); // Set of story IDs

  // Create Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newImage, setNewImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const canPost = ['rescuer', 'shelter', 'vet'].includes(role);

  useEffect(() => {
    fetchStories();
  }, []);

  useEffect(() => {
    if (user) {
        fetchUserLikes();
    } else {
        setUserLikes(new Set());
    }
  }, [user]);

  const fetchUserLikes = async () => {
      try {
          const { data, error } = await supabase
            .from('story_likes')
            .select('story_id')
            .eq('user_id', user.id);
          
          if (error) throw error;
          
          setUserLikes(new Set(data.map(item => item.story_id)));
      } catch (err) {
          console.error("Error fetching likes:", err);
      }
  };

  const fetchStories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('success_stories')
        .select(`
            *,
            author:author_id (full_name, avatar_url, role)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStories(data || []);
    } catch (err) {
      console.error("Error fetching stories:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (storyId) => {
      setLoadingComments(true);
      try {
          const { data, error } = await supabase
            .from('story_comments')
            .select(`
                *,
                user:user_id (full_name, avatar_url)
            `)
            .eq('story_id', storyId)
            .order('created_at', { ascending: true });
          
          if (error) throw error;
          
          setComments(prev => ({ ...prev, [storyId]: data }));
      } catch (err) {
          console.error("Error fetching comments:", err);
      } finally {
          setLoadingComments(false);
      }
  };

  const toggleComments = (storyId) => {
      if (activeStoryId === storyId) {
          setActiveStoryId(null);
      } else {
          setActiveStoryId(storyId);
          if (!comments[storyId]) {
              fetchComments(storyId);
          }
      }
  };

  const postComment = async (storyId) => {
      const content = commentInputs[storyId] || '';
      if (!content.trim()) return;
      if (!user) {
          alert("Please login to comment.");
          return;
      }

      try {
          const { data, error } = await supabase
            .from('story_comments')
            .insert([{
                story_id: storyId,
                user_id: user.id,
                content: content
            }])
            .select(`*, user:user_id(full_name, avatar_url)`)
            .single();

          if (error) throw error;

          setComments(prev => ({
              ...prev,
              [storyId]: [...(prev[storyId] || []), data]
          }));
          setCommentInputs(prev => ({ ...prev, [storyId]: '' }));
      } catch (err) {
          console.error("Error posting comment:", err);
      }
  };

  const deleteComment = async (commentId, storyId) => {
      try {
          const { error } = await supabase
            .from('story_comments')
            .delete()
            .eq('id', commentId);
          
          if (error) throw error;

          setComments(prev => ({
              ...prev,
              [storyId]: prev[storyId].filter(c => c.id !== commentId)
          }));
      } catch (err) {
          console.error("Error deleting comment:", err);
      }
  };

  const deleteStory = async (storyId) => {
      if (!confirm("Are you sure you want to delete this story?")) return;

      try {
          const { error } = await supabase
            .from('success_stories')
            .delete()
            .eq('id', storyId);

          if (error) throw error;

          setStories(prev => prev.filter(s => s.id !== storyId));
      } catch (err) {
          console.error("Error deleting story:", err);
          alert("Failed to delete story.");
      }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('story-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('story-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Security Check: Only NGOs can post
    if (!['rescuer', 'shelter', 'vet'].includes(role)) {
        alert("Only authorized NGOs (Rescuers, Shelters, Vets) can post success stories.");
        return;
    }

    setSubmitting(true);
    try {
        let imageUrl = null;
        if (newImage) {
            imageUrl = await uploadImage(newImage);
        }

        const { error } = await supabase.from('success_stories').insert([{
            author_id: user.id,
            title: newTitle,
            content: newContent,
            image_url: imageUrl
        }]);

        if (error) throw error;

        // Reset and Refresh
        setShowCreateModal(false);
        setNewTitle('');
        setNewContent('');
        setNewImage(null);
        setImagePreview(null);
        fetchStories();

    } catch (err) {
        console.error("Error posting story:", err);
        alert("Failed to post story. Please try again.");
    } finally {
        setSubmitting(false);
    }
  };

  const handleLike = async (storyId) => {
      if (!user) {
          alert("Please login to like stories.");
          return;
      }

      const isLiked = userLikes.has(storyId);
      
      // Optimistic Update
      setUserLikes(prev => {
          const newLikes = new Set(prev);
          if (isLiked) newLikes.delete(storyId);
          else newLikes.add(storyId);
          return newLikes;
      });

      setStories(stories.map(s => 
          s.id === storyId 
            ? { ...s, likes_count: (s.likes_count || 0) + (isLiked ? -1 : 1) } 
            : s
      ));

      try {
          if (isLiked) {
              // Remove Like
              const { error } = await supabase
                .from('story_likes')
                .delete()
                .match({ story_id: storyId, user_id: user.id });
              
              if (error) throw error;
          } else {
              // Add Like
              const { error } = await supabase
                .from('story_likes')
                .insert([{ story_id: storyId, user_id: user.id }]);
              
              if (error) throw error;
          }
      } catch (err) {
          console.error("Error toggling like:", err);
          // Revert on error (optional but recommended)
          // For now, simplicity: just console error
      }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-900 pb-20 transition-colors duration-300 relative overflow-hidden">
      {/* Floating Background Icons */}
      <div className="absolute inset-0 pointer-events-none z-0">
          <motion.div animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute top-20 left-10 text-emerald-500/10">
              <Star size={64} />
          </motion.div>
          <motion.div animate={{ y: [0, 30, 0], rotate: [0, -15, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute top-1/3 right-10 text-yellow-500/10">
              <Sparkles size={80} />
          </motion.div>
          <motion.div animate={{ y: [0, -25, 0], scale: [1, 1.1, 1] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute bottom-1/4 left-20 text-teal-500/10">
              <Heart size={50} />
          </motion.div>
      </div>
      
      {/* Flying Parrot */}
      <div className="fixed top-32 left-0 w-full h-20 pointer-events-none z-10 overflow-hidden">
        <motion.div
            initial={{ x: -100, y: 0 }}
            animate={{ 
                x: ["0vw", "120vw"],
                y: [0, -20, 10, -10, 0]
             }}
            transition={{ 
                duration: 15,
                repeat: Infinity,
                repeatDelay: 45, // Total cycle ~ 1 minute
                ease: "linear",
                times: [0, 1]
            }}
            className="absolute text-emerald-500 dark:text-emerald-400"
        >
            <div className="w-16 h-16 transform -scale-x-100"> 
               <AnimatedParrot />
            </div>
            <motion.div 
                animate={{ rotate: [-20, 10, -20] }} 
                transition={{ duration: 0.2, repeat: Infinity }}
            >
                {/* Wing flap simulation */}
            </motion.div>
        </motion.div>
      </div>

      {/* Peeping Pets */}
      <div className="fixed bottom-0 right-10 z-50 flex gap-4 pointer-events-none">
          {/* Peeping Dog */}
          <motion.div
            animate={{ y: [100, 0, 0, 100] }}
            transition={{ 
                duration: 4,
                times: [0, 0.2, 0.8, 1],
                repeat: Infinity,
                repeatDelay: 10,
                ease: "easeInOut"
            }}
            className="bg-amber-100 p-0 rounded-t-full border-4 border-amber-500 border-b-0 overflow-hidden w-16 h-16 flex items-end justify-center"
          >
              <div className="w-full h-full transform translate-y-1">
                 <AnimatedDog />
              </div>
          </motion.div>

           {/* Peeping Cat */}
           <motion.div
            animate={{ y: [100, 0, 0, 100] }}
            transition={{ 
                duration: 5,
                times: [0, 0.2, 0.8, 1],
                repeat: Infinity,
                repeatDelay: 7,
                delay: 3,
                ease: "easeInOut"
            }}
            className="bg-gray-100 p-0 rounded-t-full border-4 border-gray-500 border-b-0 overflow-hidden w-16 h-16 flex items-end justify-center"
          >
               <div className="w-full h-full transform translate-y-2 scale-90">
                  <AnimatedCat />
               </div>
          </motion.div>
      </div>

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-16 px-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="max-w-4xl mx-auto relative z-10 text-center">
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}>
                  <div className="inline-flex items-center justify-center p-3 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
                      <Award size={32} className="text-yellow-300" />
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">Success Stories</h1>
                  <p className="text-lg md:text-xl text-emerald-50 font-medium max-w-2xl mx-auto leading-relaxed">
                      Celebrating every paw that found a home and every life that was saved.
                  </p>
              </motion.div>
          </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-8 relative z-20">
          
          {/* Create Button (Only for NGOs) */}
          {canPost && !showCreateModal && (
              <motion.button 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={() => setShowCreateModal(true)}
                className="w-full bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-4 hover:shadow-xl transition-all cursor-pointer group mb-8"
              >
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                      <PenTool size={20} />
                  </div>
                  <div className="text-left flex-1">
                      <h3 className="font-bold text-gray-800 dark:text-white">Share a Success Story</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Inspire others with your improved rescues.</p>
                  </div>
                  <div className="bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white px-4 py-2 rounded-full font-bold text-sm transition-colors">Post Now</div>
              </motion.button>
          )}

          {/* Create Modal */}
          <AnimatePresence>
            {showCreateModal && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden mb-8"
                >
                    <div className="p-6 md:p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">New Success Story</h2>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-500">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Title</label>
                                <input 
                                    type="text" 
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                    placeholder="e.g. Bella's Journey to Recovery"
                                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-lg placeholder-slate-400 dark:placeholder-slate-500"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">The Story</label>
                                <textarea 
                                    value={newContent}
                                    onChange={e => setNewContent(e.target.value)}
                                    placeholder="Tell us what happened..."
                                    rows={5}
                                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none resize-none leading-relaxed placeholder-slate-400 dark:placeholder-slate-500"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Photo</label>
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${imagePreview ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                                >
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="h-full w-full object-contain rounded-lg" />
                                    ) : (
                                        <>
                                            <Camera size={32} className="text-slate-400 dark:text-slate-500 mb-2" />
                                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Click to upload photo</span>
                                        </>
                                    )}
                                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={submitting}
                                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {submitting ? 'Publishing...' : <>Publish Story <Send size={20} /></>}
                            </button>
                        </form>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>

          {/* Feed */}
          <div className="space-y-8">
              {loading ? (
                  Array(3).fill(0).map((_, i) => (
                      <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl h-96 animate-pulse shadow-sm border border-slate-100 dark:border-slate-700"></div>
                  ))
              ) : stories.length === 0 ? (
                  <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                          <PenTool size={32} className="text-slate-300 dark:text-slate-500" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-700 dark:text-white">No stories yet</h3>
                      <p className="text-slate-500 dark:text-slate-400">Be the first to share a success story!</p>
                  </div>
              ) : (
                  stories.map((story, index) => (
                      <motion.div 
                        key={story.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden border border-slate-100 dark:border-slate-700 transition-colors duration-300"
                      >
                          {/* Author Header */}
                          <div className="p-6 flex items-center gap-4 border-b border-slate-50 dark:border-slate-700/50">
                              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden shadow-sm border border-slate-100 dark:border-slate-600">
                                  {story.author?.avatar_url ? (
                                      <img src={story.author.avatar_url} alt={story.author.full_name} className="w-full h-full object-cover" />
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                                          {story.author?.full_name?.[0] || 'U'}
                                      </div>
                                  )}
                              </div>
                              <div>
                                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1">
                                      {story.author?.full_name || 'Unknown Helper'}
                                      {story.author?.is_verified && <BadgeCheck size={16} className="text-blue-500 fill-blue-50" />}
                                  </h3>
                                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                                      <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">{story.author?.role || 'Rescuer'}</span>
                                      <span>•</span>
                                      <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(story.created_at).toLocaleDateString()}</span>
                                  </div>
                              </div>
                          </div>

                          {/* Image */}
                          <div className="aspect-video bg-slate-100 dark:bg-slate-700 relative overflow-hidden group">
                              <img 
                                src={story.image_url || DEFAULT_IMAGES[index % DEFAULT_IMAGES.length]} 
                                alt={story.title} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          </div>

                          {/* Content */}
                          <div className="p-8 pb-4">
                              <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-3 leading-tight">{story.title}</h2>
                              <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line text-lg">
                                  {story.content}
                              </p>
                          </div>

                          {/* Actions */}
                          <div className="px-8 py-4 flex items-center justify-between border-b border-slate-50 dark:border-slate-700/50">
                              <button 
                                onClick={() => handleLike(story.id)}
                                className={`group flex items-center gap-2 transition-colors ${userLikes.has(story.id) ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400'}`}
                              >
                                  <div className={`p-2 rounded-full transition-colors ${userLikes.has(story.id) ? 'bg-rose-50 dark:bg-rose-900/20' : 'group-hover:bg-rose-50 dark:group-hover:bg-rose-900/20'}`}>
                                      <Heart 
                                        size={20} 
                                        className={`transition-transform group-active:scale-90 ${userLikes.has(story.id) ? 'fill-rose-500' : ''}`}
                                      />
                                  </div>
                                  <span className="font-bold text-sm">{story.likes_count || 0}</span>
                              </button>
                              
                              <button 
                                onClick={() => toggleComments(story.id)}
                                className={`flex items-center gap-2 transition-colors group ${activeStoryId === story.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'}`}
                              >
                                  <div className="p-2 rounded-full group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-colors">
                                      <MessageCircle size={20} />
                                  </div>
                                  <span className="font-bold text-sm">
                                      {comments[story.id]?.length !== undefined ? comments[story.id].length : 'Comments'}
                                  </span>
                              </button>

                              <button className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors group">
                                  <div className="p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                                      <Share2 size={20} />
                                  </div>
                              </button>

                              {/* DELETE BUTTON FOR ADMINS OR AUTHOR */}
                              {(profile?.is_admin || (user && user.id === story.author_id)) && (
                                  <button 
                                      onClick={() => deleteStory(story.id)}
                                      className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors group"
                                      title="Delete Story"
                                  >
                                      <div className="p-2 rounded-full group-hover:bg-red-50 dark:group-hover:bg-red-900/20 transition-colors">
                                          <Trash2 size={20} />
                                      </div>
                                  </button>
                              )}
                          </div>

                          {/* Comments Section */}
                          <AnimatePresence>
                              {activeStoryId === story.id && (
                                  <motion.div 
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700/50 overflow-hidden"
                                  >
                                      <div className="p-6 space-y-4">
                                          {/* Comment Input */}
                                          {user ? (
                                              <div className="flex gap-3 items-start">
                                                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                                                      {user.user_metadata?.avatar_url && (
                                                          <img src={user.user_metadata.avatar_url} alt="Me" className="w-full h-full object-cover" />
                                                      )}
                                                  </div>
                                                  <div className="flex-1 relative">
                                                      <textarea 
                                                          value={commentInputs[story.id] || ''}
                                                          onChange={e => setCommentInputs(prev => ({ ...prev, [story.id]: e.target.value }))}
                                                          placeholder="Write a warm comment..."
                                                          rows={1}
                                                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl px-4 py-3 pr-12 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none overflow-hidden placeholder-slate-400 dark:placeholder-slate-500"
                                                          onKeyDown={e => {
                                                              if(e.key === 'Enter' && !e.shiftKey) {
                                                                  e.preventDefault();
                                                                  postComment(story.id);
                                                              }
                                                          }}
                                                      />
                                                      <button 
                                                          onClick={() => postComment(story.id)}
                                                          disabled={!commentInputs[story.id]?.trim()}
                                                          className="absolute right-2 top-2 p-1.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-all"
                                                      >
                                                          <Send size={14} />
                                                      </button>
                                                  </div>
                                              </div>
                                          ) : (
                                              <div className="text-center py-4 text-sm text-slate-400">
                                                  Log in to post a comment.
                                              </div>
                                          )}

                                          {/* Comments List */}
                                          <div className="space-y-4 pt-2">
                                              {loadingComments ? (
                                                  <div className="text-center text-slate-400 text-sm py-4">Loading comments...</div>
                                              ) : !comments[story.id] || comments[story.id].length === 0 ? (
                                                  <div className="text-center text-slate-400 text-sm py-4 italic">No comments yet. Be the first!</div>
                                              ) : (
                                                  comments[story.id].map(comment => (
                                                      <div key={comment.id} className="flex gap-3 group/comment">
                                                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0 mt-1">
                                                              {comment.user?.avatar_url ? (
                                                                  <img src={comment.user.avatar_url} alt={comment.user.full_name} className="w-full h-full object-cover" />
                                                              ) : (
                                                                  <div className="w-full h-full flex items-center justify-center bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-300 text-xs font-bold">
                                                                      {comment.user?.full_name?.[0] || 'U'}
                                                                  </div>
                                                              )}
                                                          </div>
                                                          <div className="flex-1 bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 shadow-sm relative">
                                                              <div className="flex justify-between items-start mb-1">
                                                                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{comment.user?.full_name || 'User'}</span>
                                                                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(comment.created_at).toLocaleDateString()}</span>
                                                              </div>
                                                              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{comment.content}</p>
                                                              
                                                              {user && user.id === comment.user_id && (
                                                                  <button 
                                                                    onClick={() => deleteComment(comment.id, story.id)}
                                                                    className="absolute -right-8 top-2 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover/comment:opacity-100 transition-all"
                                                                  >
                                                                      <Trash2 size={14} />
                                                                  </button>
                                                              )}
                                                          </div>
                                                      </div>
                                                  ))
                                              )}
                                          </div>
                                      </div>
                                  </motion.div>
                              )}
                          </AnimatePresence>
                      </motion.div>
                  ))
              )}
          </div>
      </div>
    </div>
  );
}
