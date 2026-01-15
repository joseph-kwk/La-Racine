import React, { useState, useEffect } from 'react';
import { memberAPI } from '../services/api';

const DashboardMembers = () => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const response = await memberAPI.getAllMembers();
            setMembers(response.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching members:", err);
            setError("Could not load family members.");
            setLoading(false);
        }
    };

    const filteredMembers = members.filter(member =>
        (member.first_name + ' ' + member.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.birth_place || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-gray-500">Loading members...</div>;

    return (
        <div className="members-content">
            <section className="dashboard-section">
                <div className="section-header flex justify-between items-center mb-6">
                    <h2 className="section-title text-2xl font-bold text-gray-800">Family Members</h2>
                    {/* Add Member - In a real app, this might open a modal or navigate to a global add form */}
                    <button className="btn btn-primary" onClick={() => alert('Navigate to Tree > Add Member to add specific members.')}>
                        + Add Member
                    </button>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Search members by name or place..."
                        className="form-input w-full p-3 border rounded-lg shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {error && <div className="text-red-500 mb-4">{error}</div>}

                {/* Members Grid */}
                <div className="members-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMembers.length > 0 ? (
                        filteredMembers.map(member => (
                            <div key={member.id} className="member-card bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
                                <div className="member-card-header flex justify-between items-start mb-4">
                                    <div className="member-info">
                                        <h3 className="member-card-name text-lg font-bold text-gray-800">
                                            {member.first_name} {member.last_name}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {member.gender === 'M' ? 'Male' : member.gender === 'F' ? 'Female' : 'Other'}
                                        </p>
                                    </div>
                                    <span className="text-2xl">
                                        {member.gender === 'M' ? '👨' : member.gender === 'F' ? '👩' : '👤'}
                                    </span>
                                </div>
                                <div className="member-card-details space-y-2">
                                    <div className="member-detail text-sm text-gray-600">
                                        <strong>Born:</strong> {member.birth_date ? new Date(member.birth_date).toLocaleDateString() : 'Unknown'}
                                    </div>
                                    {member.death_date && (
                                        <div className="member-detail text-sm text-gray-600">
                                            <strong>Died:</strong> {new Date(member.death_date).toLocaleDateString()}
                                        </div>
                                    )}
                                    <div className="member-detail text-sm text-gray-600">
                                        <strong>Place:</strong> {member.birth_place || 'Unknown'}
                                    </div>
                                </div>
                                <div className="member-card-actions mt-4 pt-4 border-t border-gray-100 flex justify-end">
                                    <button className="btn btn-outline btn-sm">View Profile</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-lg">
                            <div className="text-4xl mb-4">👥</div>
                            <p className="text-lg">No members found.</p>
                            <p className="text-sm">Try adjusting your search or add new members to your trees.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default DashboardMembers;
