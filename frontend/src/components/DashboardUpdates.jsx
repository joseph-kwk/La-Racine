import React, { useState, useEffect } from 'react';
import { updateAPI } from '../services/api';

const DashboardUpdates = () => {
    const [updates, setUpdates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newUpdateContent, setNewUpdateContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchUpdates();
    }, []);

    const fetchUpdates = async () => {
        try {
            const response = await updateAPI.getAllUpdates();
            setUpdates(response.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching updates:", err);
            // It's possible the endpoint returns empty or 404 if not set up, handle gracefully
            setError("Could not load updates.");
            setLoading(false);
        }
    };

    const handlePostUpdate = async (e) => {
        e.preventDefault();
        if (!newUpdateContent.trim()) return;

        setIsSubmitting(true);
        try {
            const response = await updateAPI.createUpdate({ content: newUpdateContent, type: 'status' });
            setUpdates([response.data, ...updates]);
            setNewUpdateContent('');
        } catch (err) {
            console.error("Error posting update:", err);
            alert("Failed to post update.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading updates...</div>;

    return (
        <div className="updates-content">
            <section className="dashboard-section">
                <div className="section-header flex justify-between items-center mb-6">
                    <h2 className="section-title text-2xl font-bold text-gray-800">Family Updates</h2>
                </div>

                {/* Post New Update */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                    <h3 className="text-lg font-semibold mb-4 text-gray-700">Share some news</h3>
                    <form onSubmit={handlePostUpdate}>
                        <textarea
                            className="form-input w-full p-4 border rounded-lg mb-4 resize-none h-24 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="What's new with the family?"
                            value={newUpdateContent}
                            onChange={(e) => setNewUpdateContent(e.target.value)}
                        />
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className={`btn btn-primary ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Posting...' : 'Post Update'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Updates Feed */}
                <div className="updates-feed space-y-6">
                    {updates.length > 0 ? (
                        updates.map(update => (
                            <div key={update.id} className="update-card bg-white p-6 rounded-lg shadow-md">
                                <div className="update-header flex items-center mb-4">
                                    <div className="avatar bg-purple-100 text-purple-600 rounded-full w-10 h-10 flex items-center justify-center mr-3 font-bold">
                                        {update.author_name ? update.author_name[0] : 'U'}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-800">{update.author_name || 'Family Member'}</div>
                                        <div className="text-xs text-gray-500">{new Date(update.created_at).toLocaleString()}</div>
                                    </div>
                                </div>
                                <div className="update-body text-gray-700 leading-relaxed">
                                    {update.content}
                                </div>
                                {/* Actions like Comment/Like could go here */}
                                <div className="update-footer mt-4 pt-3 border-t border-gray-100 flex gap-4">
                                    <button className="text-gray-500 text-sm hover:text-purple-600">❤️ Like</button>
                                    <button className="text-gray-500 text-sm hover:text-purple-600">💬 Comment</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state bg-white p-12 text-center rounded-lg border-2 border-dashed border-gray-200">
                            <div className="text-4xl mb-4 opacity-50">📰</div>
                            <h3 className="text-lg font-medium text-gray-900">No updates yet</h3>
                            <p className="text-gray-500 mt-1">Be the first to share something with the family!</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default DashboardUpdates;
