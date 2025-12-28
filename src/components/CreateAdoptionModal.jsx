import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { X, Upload, Camera, Save, Dog, Cat, Info, Check } from 'lucide-react';

export default function CreateAdoptionModal({ isOpen, onClose, onCreated, session }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    species: 'dog',
    breed: '',
    age_years: '',
    age_months: '',
    gender: 'Unknown',
    location: '',
    description: '',
    medical_history: '',
    behavior_notes: '',
    vaccinated: false,
    neutered: false,
    good_with_kids: false,
    good_with_pets: false,
    contact_info: session?.user?.email || ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('adoption-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('adoption-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const { error } = await supabase
        .from('adoptions')
        .insert([{
          ...formData,
          image_url: imageUrl,
          posted_by: session.user.id,
          status: 'available'
        }]);

      if (error) throw error;

      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to create listing: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content p-8">
        <div className="flex justify-between items-center mb-8">
          <h2>List a Pet for Adoption</h2>
          <button onClick={onClose} className="btn btn-secondary rounded-full p-2" style={{ width: '36px', height: '36px' }}><X size={20} /></button>
        </div>

        {error && (
            <div className="alert alert-error">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Media & Basic Info */}
          <div className="flex flex-col gap-6">
            
            {/* Image Upload */}
            <div 
                className="flex items-center justify-center overflow-hidden relative cursor-pointer"
                style={{ 
                    height: '250px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', 
                    border: '2px dashed var(--border-color)' 
                }}
                onClick={() => document.getElementById('adopt-img-upload').click()}
            >
                {imagePreview ? (
                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <div className="text-center text-muted">
                        <Camera size={48} className="mb-4 mx-auto" />
                        <p>Click to upload photo</p>
                    </div>
                )}
                <input id="adopt-img-upload" type="file" hidden accept="image/*" onChange={handleImageChange} />
            </div>

            <div className="form-group">
                <label className="form-label">Pet Name</label>
                <input type="text" name="name" className="form-input" value={formData.name} onChange={handleChange} required placeholder="e.g. Rex" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                    <label className="form-label">Species</label>
                    <select name="species" className="form-select" value={formData.species} onChange={handleChange}>
                        <option value="dog">Dog</option>
                        <option value="cat">Cat</option>
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Breed</label>
                    <input type="text" name="breed" className="form-input" value={formData.breed} onChange={handleChange} placeholder="e.g. Labrador" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-2">
                    <div className="form-group">
                        <label className="form-label">Age (Yrs)</label>
                        <input type="number" name="age_years" className="form-input" value={formData.age_years} onChange={handleChange} min="0" placeholder="0" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">(Mths)</label>
                        <input type="number" name="age_months" className="form-input" value={formData.age_months} onChange={handleChange} min="0" max="11" placeholder="0" />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select name="gender" className="form-select" value={formData.gender} onChange={handleChange}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Unknown">Unknown</option>
                    </select>
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Location (City/Area)</label>
                <input type="text" name="location" className="form-input" value={formData.location} onChange={handleChange} required placeholder="e.g. Colombo 05" />
            </div>
          </div>

          {/* Right Column: Details & Medical */}
          <div className="flex flex-col gap-6">
            
            <div className="form-group">
                <label className="form-label">Description (Bio)</label>
                <textarea name="description" className="form-textarea" value={formData.description} onChange={handleChange} rows="3" placeholder="Tell us about the pet..." />
            </div>

            <div className="form-group">
                <label className="form-label">Medical History</label>
                <textarea name="medical_history" className="form-textarea" value={formData.medical_history} onChange={handleChange} rows="2" placeholder="Vaccinations, surgeries, conditions..." />
            </div>

            <div className="form-group">
                <label className="form-label">Behavior Notes</label>
                <textarea name="behavior_notes" className="form-textarea" value={formData.behavior_notes} onChange={handleChange} rows="2" placeholder="Friendly? Shy? Energetic?..." />
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 rounded-md" style={{ background: 'var(--bg-subtle)' }}>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-small">
                    <input type="checkbox" name="vaccinated" checked={formData.vaccinated} onChange={handleChange} /> Vaccinated
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-small">
                    <input type="checkbox" name="neutered" checked={formData.neutered} onChange={handleChange} /> Neutered
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-small">
                    <input type="checkbox" name="good_with_kids" checked={formData.good_with_kids} onChange={handleChange} /> Good w/ Kids
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-small">
                    <input type="checkbox" name="good_with_pets" checked={formData.good_with_pets} onChange={handleChange} /> Good w/ Pets
                </label>
            </div>

            <div className="form-group">
                <label className="form-label">Contact Info (visible to adopters)</label>
                <input type="text" name="contact_info" className="form-input" value={formData.contact_info} onChange={handleChange} />
            </div>

            <button 
                type="submit" 
                className="btn btn-primary mt-auto" 
                disabled={loading}
            >
                {loading ? 'Publishing...' : 'Publish Listing'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
