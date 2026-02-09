import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    MapPin, Camera, AlertTriangle, Send, X, Search, Phone, 
    Calendar, Clock, PawPrint, CheckCircle, FileText, Download, 
    Share2, Eye, Shield, Lock, Unlock, Truck, Heart, Bell, ChevronLeft, ChevronRight, MessageCircle, Trash2, Upload 
} from 'lucide-react';
import MapPicker from '../components/MapPicker';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { compressImage } from '../utils/imageUtils';


export default function LostAndFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session, profile } = useAuth();
  const { openChat } = useChat();
  const [activeTab, setActiveTab] = useState('alerts'); // 'alerts', 'report'
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  
  // Data for Feed
  const [lostPets, setLostPets] = useState([]);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const injuryFileInputRef = useRef(null);
  const injuryCameraInputRef = useRef(null);

  // --- FORM STATE ---
  const [reportType, setReportType] = useState('lost'); // 'lost', 'found'
  
  // A. Core Identity
  const [petName, setPetName] = useState('');
  const [species, setSpecies] = useState('Dog');
  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState('Unknown');
  const [size, setSize] = useState('Medium');

  // B. Visual Details
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [coatType, setCoatType] = useState('');
  const [distinctiveFeatures, setDistinctiveFeatures] = useState('');
  const [images, setImages] = useState([]); // Array of {file, preview}
  
  // C. The Incident
  const [lastSeenDate, setLastSeenDate] = useState('');
  const [lastSeenTime, setLastSeenTime] = useState('');
  const [locationName, setLocationName] = useState(''); 
  const [coords, setCoords] = useState(null); 
  const [temperament, setTemperament] = useState('Friendly');

  // D. Security & Contact
  const [contactPhone, setContactPhone] = useState('');
  const [hideContact, setHideContact] = useState(false);

  // E. Founder Specifics (Custody & Health)
  const [custodyStatus, setCustodyStatus] = useState('user_holding'); // 'user_holding', 'rescuer_notified'
  const [selectedRescuer, setSelectedRescuer] = useState('');
  const [isInjured, setIsInjured] = useState(false);
  const [injuryDetails, setInjuryDetails] = useState('');
  const [rescuers, setRescuers] = useState([]);
  
  // Validation State
  const [dateError, setDateError] = useState('');

  const handleDateChange = (e) => {
      const selected = e.target.value;
      const today = new Date().toISOString().split('T')[0];
      
      if (selected > today) {
          setDateError('Date cannot be in the future.');
          // Still update state so user sees what they picked, but error persists? 
          // Or block? Let's just update and show error.
          setLastSeenDate(selected);
      } else {
          setDateError('');
          setLastSeenDate(selected);
      }
  };

  // --- PET DETAIL MODAL STATE ---
  const [selectedPet, setSelectedPet] = useState(null);


  const [nameUnknown, setNameUnknown] = useState(false);

  useEffect(() => {
    fetchLostPets();
    fetchRescuers();
  }, [activeTab]);

  // Handle Deep Linking from Notifications
    // Handle Deep Linking from Notifications
    useEffect(() => {
        const fetchLinkedPet = async (id) => {
            try {
                const { data, error } = await supabase
                    .from('lost_pets')
                    .select('*')
                    .eq('id', id)
                    .single();
                if (data) {
                    setSelectedPet(data);
                    setActiveTab('alerts'); 
                    // Fetch sightings if owner
                    if (session?.user?.id === data.owner_id) {
                        fetchSightings(data.id);
                    }
                }
            } catch (err) {
                console.error("Error fetching linked pet:", err);
            }
        };

        const params = new URLSearchParams(location.search);
        const openId = params.get('open_id');
        const viewSightings = params.get('view_sightings');
        
        if (openId) {
            const existingPet = lostPets.find(p => p.id === openId);
            if (existingPet) {
                setSelectedPet(existingPet);
                setActiveTab('alerts');
                if (session?.user?.id === existingPet.owner_id) {
                    fetchSightings(existingPet.id);
                }
            } else {
                fetchLinkedPet(openId);
            }
            
            // Optional: Scroll to sightings if requested
            if (viewSightings) {
                // We might need a small timeout to let the modal render
                setTimeout(() => {
                    const sightingsSection = document.getElementById('sightings-section');
                    if (sightingsSection) sightingsSection.scrollIntoView({ behavior: 'smooth' });
                }, 1000);
            }
        }
    }, [location.search, lostPets, session]);

  const fetchRescuers = async () => {
      try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, role, location')
            .in('role', ['rescuer', 'shelter']);
          if (error) throw error;
          setRescuers(data || []);
      } catch (err) {
          console.error("Error fetching rescuers:", err);
      }
  };

  // Set default name for found pets
  useEffect(() => {
      if (reportType === 'found') {
          // If switching to found, default to unknown logic if name is empty
          if (petName === '') {
              setNameUnknown(true);
              setPetName('Unknown');
          }
      } else {
          // If switching to lost, clear unknown status
          setNameUnknown(false);
          if (petName === 'Unknown') setPetName('');
      }
  }, [reportType]);

  // Handle Name Unknown Toggle
  const handleNameUnknownChange = (e) => {
      const checked = e.target.checked;
      setNameUnknown(checked);
      if (checked) {
          setPetName('Unknown');
      } else {
          setPetName('');
      }
  };

  const fetchLostPets = async () => {
    try {
        let query = supabase
            .from('lost_pets')
            .select('*')
            .order('created_at', { ascending: false });

        if (activeTab === 'reunited') {
             const fiveDaysAgo = new Date();
             fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
             query = query
                .eq('status', 'reunited')
                .gt('updated_at', fiveDaysAgo.toISOString());
        } else {
             query = query.neq('status', 'reunited');
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        setLostPets(data || []);
    } catch (err) {
        console.error("Error fetching lost pets:", err);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files) {
        const newImages = Array.from(e.target.files).map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));
        setImages(prev => [...prev, ...newImages].slice(0, 3)); // Max 3
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Injury Images Handling
  const [injuryImages, setInjuryImages] = useState([]); // Array of {file, preview}

  const handleInjuryImageChange = (e) => {
    if (e.target.files) {
        const newImages = Array.from(e.target.files).map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));
        setInjuryImages(prev => [...prev, ...newImages].slice(0, 3)); // Max 3
    }
  };

  const removeInjuryImage = (index) => {
    setInjuryImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (imagesToUpload) => {
      const urls = [];
      for (const img of imagesToUpload) {
          let fileToUpload = img.file;
          try {
              console.log(`Compressing ${fileToUpload.name}...`);
              fileToUpload = await compressImage(img.file);
              console.log(`Compressed to ${(fileToUpload.size / 1024 / 1024).toFixed(2)} MB`);
          } catch (e) {
              console.error("Compression failed, uploading original:", e);
          }

          const fileExt = fileToUpload.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${fileName}`;
          
          const { error } = await supabase.storage.from('lost-pets').upload(filePath, fileToUpload);
          if (error) {
              console.error("Upload error", error);
              continue;
          }
          
          const { data: { publicUrl } } = supabase.storage.from('lost-pets').getPublicUrl(filePath);
          urls.push(publicUrl);
      }
      return urls;
  };

  const generateFlyer = (petData, imageUrl) => {
      try {
          const doc = new jsPDF();
          
          // Header
          doc.setFillColor(220, 38, 38); // Red
          doc.rect(0, 0, 210, 40, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(40);
          doc.setFont("helvetica", "bold");
          doc.text("MISSING PET", 105, 25, null, null, "center");

          // Photo
          if (imageUrl) {
               // Note: Adding user images to PDF often requires them to be base64 or CORS enabled
               // For this demo, we'll draw a placeholder rect if image fails or just text
               doc.addImage(imageUrl, 'JPEG', 35, 50, 140, 100); 
          }

          // Details
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(24);
          doc.text(petData.pet_name, 105, 165, null, null, "center");
          
          doc.setFontSize(14);
          doc.setFont("helvetica", "normal");
          doc.text(`Breed: ${petData.breed || 'Unknown'}`, 20, 180);
          doc.text(`Color: ${petData.primary_color}`, 110, 180);
          
          doc.text(`Last Seen: ${petData.last_seen_location}`, 20, 195);
          doc.text(`Date: ${petData.last_seen_date}`, 110, 195);

          // Contact
          doc.setFontSize(20);
          doc.setTextColor(220, 38, 38);
          doc.setFont("helvetica", "bold");
          doc.text(`CALL: ${petData.contact_phone}`, 105, 220, null, null, "center");

          doc.save(`${petData.pet_name}_Flyer.pdf`);
      } catch(e) {
          console.error("Flyer generation failed", e);
          toast.error("Could not auto-generate flyer. Please check console.");
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session || !session.user) {
        setMsg({ type: 'error', text: 'You must be logged in.' });
        return;
    }

    if (!coords && !locationName) {
        setMsg({ type: 'error', text: 'Please provide a location on the map.' });
        setLoading(false);
        return;
    }

    setLoading(true);
    setMsg(null);

    try {
        // Upload Main Images
        const uploadedImageUrls = await uploadImages(images);
        
        // Upload Injury Images (if any)
        let uploadedInjuryImageUrls = [];
        if (isInjured && injuryImages.length > 0) {
            uploadedInjuryImageUrls = await uploadImages(injuryImages); // Reuse same upload function logic if possible, or duplicate
        }
        const mainImage = uploadedImageUrls[0] || null; // Corrected to use uploadedImageUrls

        const payload = {
            owner_id: session.user.id,
            report_type: reportType,
            pet_name: petName,
            species,
            breed,
            gender,
            size,
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            coat_type: coatType,
            distinctive_features: distinctiveFeatures,
            description: distinctiveFeatures || 'No description provided', // Fallback for legacy column
            image_url: mainImage,
            additional_images: uploadedImageUrls,
            last_seen_date: lastSeenDate || null,
            last_seen_time: lastSeenTime || null,
            last_seen_location: locationName,
            latitude: coords ? coords.lat : null,
            longitude: coords ? coords.lng : null,
            temperament,
            contact_phone: contactPhone,
            hide_contact: hideContact,
            status: reportType, // 'lost' or 'found'
            // New Fields
            custody_status: reportType === 'found' ? custodyStatus : null,
            custody_rescuer_id: (reportType === 'found' && custodyStatus === 'rescuer_notified') ? (selectedRescuer || null) : null,
            is_injured: reportType === 'found' ? isInjured : false,
            injury_details: (reportType === 'found' && isInjured) ? injuryDetails : null,
            injury_images: (reportType === 'found' && isInjured) ? uploadedInjuryImageUrls : []
        };

        const { data, error } = await supabase.from('lost_pets').insert([payload]).select();

        if (error) throw error;

        // Offer Flyer via Modal instead of native prompt
        setSuccessPayload(payload);
        setSuccessImage(mainImage);
        setShowSuccessModal(true);

        // Form Reset happens when modal closes now

    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: err.message || 'Error processing request.' });
    } finally {
      setLoading(false);
    }
  };

  const markReunited = async (id) => {
      // Direct update, no confirm here because modal confirms intent
      const { error } = await supabase.from('lost_pets').update({ 
          status: 'reunited',
          updated_at: new Date() 
      }).eq('id', id);
      if (error) console.error(error);
      else {
          setShowHoorayModal(true);
          fetchLostPets();
          setSelectedPet(null);
      }
  };

  const [currentImageIndex, setCurrentImageIndex] = useState(0); // For Image Slider

  const openPetDetail = (pet) => {
      setSelectedPet(pet);
      setCurrentImageIndex(0); // Reset slider
      // If user is owner, fetch sightings
      if (session?.user?.id === pet.owner_id) {
          fetchSightings(pet.id);
      } else {
          setSightings([]);
      }
  };

  const handleMarkReunitedFromModal = async (petId) => {
    // Reuse existing function logic or call it if adaptable. 
    // For now, implementing direct logic for clearer modal context
    markReunited(petId);
    setSelectedPet(null);
  };

  const handleAcceptCustody = (petId) => {
      openPickupModal(petId);
  };

  const closePetDetail = () => {
      setSelectedPet(null);
  };

  const deletePet = async (petId, e) => {
    e.stopPropagation(); // prevent opening detail modal
    setDeleteConfirmation({ isOpen: true, petId });
  };

  // --- DELETE CONFIRMATION STATE ---
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, petId: null });

  const confirmDelete = async () => {
    if (!deleteConfirmation.petId) return;
    
    const petId = deleteConfirmation.petId;
    setDeleteConfirmation({ isOpen: false, petId: null }); // Close immediately to avoid flicker

    try {
        const { error } = await supabase
          .from('lost_pets')
          .delete()
          .eq('id', petId);

        if (error) throw error;

        setLostPets(prev => prev.filter(p => p.id !== petId));
        if (selectedPet && selectedPet.id === petId) setSelectedPet(null);
        toast.success("Report deleted successfully.");
    } catch (err) {
        console.error("Error deleting pet:", err);
        toast.error("Failed to delete report.");
    }
  };



  // --- SUCCESS MODAL STATE (Restored) ---
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showHoorayModal, setShowHoorayModal] = useState(false);
  const [successPayload, setSuccessPayload] = useState(null);
  const [successImage, setSuccessImage] = useState(null);

  // --- PICKUP SCHEDULE STATE ---
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [pickupNote, setPickupNote] = useState('');
  const [petToPickup, setPetToPickup] = useState(null);

  const openPickupModal = (petId) => {
      setPetToPickup(petId);
      setShowPickupModal(true);
  };

  const submitPickupSchedule = async () => {
      if (!pickupDate || !pickupTime) {
          toast.error("Please select both a date and time.");
          return;
      }

      try {
          const { error } = await supabase
            .from('lost_pets')
            .update({
                custody_status: 'pickup_scheduled',
                status: 'found',
                pickup_date: pickupDate,
                pickup_time: pickupTime,
                pickup_note: pickupNote
            })
            .eq('id', petToPickup);

          if (error) throw error;

          // Notify the finder
          const pet = lostPets.find(p => p.id === petToPickup);
          if (pet && pet.owner_id) {
              const { error: notifError } = await supabase
                .from('notifications')
                .insert({
                    user_id: pet.owner_id,
                    title: 'Pickup Scheduled',
                    message: `A rescuer has scheduled a pickup for ${pickupDate} at ${pickupTime}.`,
                    type: 'info',
                    link: `/lost-and-found?open_id=${petToPickup}`
                });
              if (notifError) console.error("Error sending notification:", notifError);
          }

          // Optimistic UI Update
          setLostPets(prev => prev.map(p => 
            p.id === petToPickup ? { 
                ...p, 
               custody_status: 'pickup_scheduled',
                pickup_date: pickupDate,
                pickup_time: pickupTime 
            } : p
          ));
          if (selectedPet && selectedPet.id === petToPickup) {
              setSelectedPet(prev => ({ 
                  ...prev, 
                  custody_status: 'pickup_scheduled',
                  pickup_date: pickupDate,
                  pickup_time: pickupTime 
              }));
          }

          setShowPickupModal(false);
          setPetToPickup(null);
          setPickupDate('');
          setPickupTime('');
          setPickupNote('');
          
          setMsg({ type: 'success', text: 'Pickup Scheduled! The finder has been notified.' });
          setTimeout(() => setMsg(null), 5000);

      } catch (err) {
          console.error("Error scheduling pickup:", err);
          toast.error("Failed to schedule pickup. Please try again.");
      }
  };



  // --- CLAIM PET STATE ---
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [petToClaim, setPetToClaim] = useState(null);
  
  // Claim Form State
  const [claimName, setClaimName] = useState('');
  const [claimContact, setClaimContact] = useState('');
  const [claimProof, setClaimProof] = useState('');
  const [claimImage, setClaimImage] = useState(null);
  const claimFileRef = useRef(null);

  // --- SIGHTINGS (OWNER VIEW) ---
  const [sightings, setSightings] = useState([]);
  
  const fetchSightings = async (petId) => {
      // Join with profiles to get reporter name/avatar if they are a user
      const { data, error } = await supabase
        .from('sighting_reports')
        .select('*, reporter:reporter_id(full_name, avatar_url, id)') 
        .eq('lost_pet_id', petId)
        .order('created_at', { ascending: false });
      
      if (error) console.error("Error fetching sightings:", error);
      else setSightings(data || []);
  };

  // --- REPORT SIGHTING STATE ---
  const [showSightingModal, setShowSightingModal] = useState(false);
  const [sightingDate, setSightingDate] = useState('');
  const [sightingTime, setSightingTime] = useState('');
  const [sightingLocation, setSightingLocation] = useState('');
  const [sightingDescription, setSightingDescription] = useState('');
  const [sightingImage, setSightingImage] = useState(null);
  const [sightingCoords, setSightingCoords] = useState(null);
  const [reporterPhone, setReporterPhone] = useState('');
  const sightingFileRef = useRef(null);
  
  const [sightingDateError, setSightingDateError] = useState('');

  const handleSightingDateChange = (e) => {
    const selected = e.target.value;
    const today = new Date().toISOString().split('T')[0];
    
    if (selected > today) {
        setSightingDateError('Date cannot be in the future.');
        setSightingDate(selected);
    } else {
        setSightingDateError('');
        setSightingDate(selected);
    }
  };

  const openSightingModal = () => {
      setSightingDate(new Date().toISOString().split('T')[0]);
      setSightingTime(new Date().toTimeString().slice(0, 5));
      setSightingLocation('');
      setSightingDescription('');
      setReporterPhone('');
      setSightingImage(null);
      setSightingCoords(null);
      setShowSightingModal(true);
  };

  const handleSightingSubmit = async (e) => {
      e.preventDefault();
      if (!selectedPet) return;
      
      setLoading(true);
      try {
          // 1. Upload Image if exists
          let imageUrl = null;
          if (sightingImage) {
              let fileToUpload = sightingImage;
              try {
                  fileToUpload = await compressImage(sightingImage);
              } catch (e) {
                  console.error("Compression failed:", e);
              }

              const fileExt = fileToUpload.name.split('.').pop();
              const fileName = `sighting_${Date.now()}.${fileExt}`;
              const { error: uploadError } = await supabase.storage
                  .from('lost-pets')
                  .upload(fileName, fileToUpload);
              
              if (uploadError) throw uploadError;

              const { data: publicUrlData } = supabase.storage
                  .from('lost-pets')
                  .getPublicUrl(fileName);
              imageUrl = publicUrlData.publicUrl;
          }

          // 2. Insert Sighting Report
          const reportPayload = {
              lost_pet_id: selectedPet.id,
              reporter_id: session?.user?.id || null, 
              sighting_date: sightingDate,
              sighting_time: sightingTime,
              sighting_location: sightingLocation,
              latitude: sightingCoords?.lat || null,
              longitude: sightingCoords?.lng || null,
              description: sightingDescription,
              image_url: imageUrl,
              reporter_phone: reporterPhone
          };

          const { error: insertError } = await supabase
              .from('sighting_reports')
              .insert(reportPayload);

          if (insertError) throw insertError;

          // 3. Update Pet Status to 'sighted'
          const { error: updateError } = await supabase
            .rpc('mark_pet_sighted', { row_id: selectedPet.id });
          
          if (updateError) console.error("Error updating status:", updateError);

          // 4. Notify Owner
          const { error: notifError } = await supabase
              .from('notifications')
              .insert({
                  user_id: selectedPet.owner_id,
                  title: 'Target Sighted! 🐾',
                  message: `Someone saw ${selectedPet.pet_name} at ${sightingLocation}. They also provided contact info.`,
                  type: 'alert', // Ensure this style handles high priority
                  link: `/lost-and-found?open_id=${selectedPet.id}&view_sightings=true`
              });

          if (notifError) console.error("Notif error:", notifError);

          setShowSightingModal(false);
          setMsg({ type: 'success', text: 'Sighting reported! Status updated to Sighted.' });
          setTimeout(() => setMsg(null), 5000);
          
          // Refresh lists
          fetchLostPets();
          if (selectedPet) setSelectedPet(prev => ({ ...prev, status: 'sighted' }));

      } catch (err) {
          console.error("Error reporting sighting:", err);
          setMsg({ type: 'error', text: 'Failed to report sighting. Please try again.' });
      } finally {
          setLoading(false);
      }
  };

  const openClaimModal = (pet) => {
      setPetToClaim(pet);
      // Pre-fill if we have user info, else blank
      setClaimName(user?.user_metadata?.full_name || ''); 
      setClaimContact(user?.email || '');
      setClaimProof('');
      setClaimImage(null);
      setShowClaimModal(true);
  };

  const confirmClaimPet = async () => {
      if (!petToClaim) return;
      if (!claimName || !claimContact || !claimProof) {
          setMsg({ type: 'error', text: 'Please fill in your name, contact info, and proof details.' });
          setTimeout(() => setMsg(null), 3000);
          return;
      }

      try {
          // 1. Upload Proof Image (if any)
          let proofImageUrl = "No image provided";
          if (claimImage) {
              let fileToUpload = claimImage;
              try {
                  fileToUpload = await compressImage(claimImage);
              } catch (e) {
                  console.error("Compression failed:", e);
              }

              const fileExt = fileToUpload.name.split('.').pop();
              const fileName = `${Date.now()}_proof.${fileExt}`;
              const { error: uploadError } = await supabase.storage
                  .from('lost-pets') // FIXED: Using correct bucket 'lost-pets'
                  .upload(fileName, fileToUpload);

              if (uploadError) throw uploadError;
              
              const { data: publicUrlData } = supabase.storage
                  .from('lost-pets')
                  .getPublicUrl(fileName);
              
              proofImageUrl = publicUrlData.publicUrl;
          }

          // 2. Construct Detailed Message
          const claimMessage = `
CLAIMANT: ${claimName}
CONTACT: ${claimContact}
PROOF DETAILS: ${claimProof}
PROOF IMAGE: ${proofImageUrl === "No image provided" ? "None" : "See attachment"}
          `.trim();

          const notificationPayload = {
              title: '👑 Pet Claimed! (Action Required)',
              message: claimMessage, // Detailed text for the UI
              type: 'alert',
              link: `/lost-and-found?open_id=${petToClaim.id}&proof_img=${encodeURIComponent(proofImageUrl)}`
          };

          // 3. Notify Finder
          const { error: finderError } = await supabase
            .from('notifications')
            .insert({ ...notificationPayload, user_id: petToClaim.owner_id });
          
          if (finderError) throw finderError;

          // 4. Notify Rescuer (if exists)
          if (petToClaim.custody_rescuer_id) {
              await supabase
                .from('notifications')
                .insert({ ...notificationPayload, user_id: petToClaim.custody_rescuer_id });
          }

          setShowClaimModal(false);
          setMsg({ type: 'success', text: 'Claim submitted! The finder has been notified with your details.' });
          setTimeout(() => setMsg(null), 5000);

      } catch (error) {
          console.error("Error claiming pet:", error);
          setMsg({ type: 'error', text: 'Failed to submit claim. Please try again.' }); // FIXED: UI message
          setTimeout(() => setMsg(null), 4000);
      }
  };

  const handleSuccessModalClose = (shouldGenerate) => {
      if (shouldGenerate && successPayload) {
          generateFlyer(successPayload, successImage);
      }
      
      setShowSuccessModal(false);
      setSuccessPayload(null);
      setSuccessImage(null);
      
      // Reset Form State
      setPetName('');
      setSpecies('Dog');
      setBreed('');
      setGender('Unknown');
      setSize('Medium');
      setPrimaryColor('');
      setSecondaryColor('');
      setCoatType('');
      setDistinctiveFeatures('');
      setImages([]);
      setLastSeenDate('');
      setLastSeenTime('');
      setLocationName('');
      setCoords(null);
      setTemperament('Friendly');
      setContactPhone('');
      setHideContact(false);
      setCustodyStatus('user_holding');
      setSelectedRescuer('');
      setIsInjured(false);
      setInjuryDetails('');
      setInjuryImages([]);
      
      // Navigate / Reset
      setActiveTab('alerts');
      fetchLostPets();
      window.scrollTo(0,0);
  };

  // --- STYLES ---
  // Replaced with specific tailwind classes in render to support dark mode better, 
  // or simple conditional object:
  // but let's keep it for now and add dark mode via class if possible? 
  // Easier to replace specific usage sites with Tailwind classes.
  const glassCardStyle = {
    // backdropFilter is handled by class, this is just fallback or specific overrides
  };

  const inputFieldStyles = `
    .input-field {
        width: 100%;
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid #e2e8f0;
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        font-size: 0.95rem;
        outline: none;
        transition: all 0.2s;
        color: #1e293b;
    }
    :is(.dark) .input-field {
        background: rgba(15, 23, 42, 0.6);
        border-color: #334155;
        color: #f8fafc; /* Ensure text is light/white in dark mode */
    }
    :is(.dark) .input-field::placeholder {
        color: #94a3b8; /* Make placeholder visible but lighter */
    }
    .input-field:focus {
        background: white;
        border-color: #f43f5e;
        box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.1);
    }
    :is(.dark) .input-field:focus {
        background: rgba(30, 41, 59, 0.8); /* Keep background dark on focus */
        color: white;
    }
  `;

  // TABS
  const tabs = [
    { id: 'alerts', label: 'Active Alerts', icon: <Bell size={18} /> },
    { id: 'report', label: 'Report Lost/Found', icon: <AlertTriangle size={18} /> },
    { id: 'reunited', label: 'Reunited', icon: <Heart size={18} /> },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 pt-24 pb-12 px-4 relative transition-colors duration-300">
      
      {/* Removed Duplicate Header Tabs */}
      
      {/* PET DETAIL MODAL */}
      {selectedPet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl relative my-8 border dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                <button onClick={closePetDetail} className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-lg transition-colors">
                    <X size={20} />
                </button>
                
                <div className="flex flex-col md:flex-row h-full">
                    {/* Left: Images */}
                    {/* Left: Images Slider */}
                    <div className="md:w-1/2 bg-slate-900 relative min-h-[300px] md:min-h-full group">
                        {(() => {
                            // Prepare images list
                            // If additional_images exists and has items, use it. Otherwise fallback to single image_url
                            const sliderImages = (selectedPet.additional_images && selectedPet.additional_images.length > 0) 
                                ? selectedPet.additional_images 
                                : [selectedPet.image_url];
                                
                            // Determine current image to show (using a simple local var won't work for re-renders, needs state)
                            // Since we can't easily add state inside this conditional block without extracting a component,
                            // AND 'selectedPet' changes, we might want to use a state in the main component.
                            // However, a simple solution for now is to use a controlled index, OR extract a small component.
                            // Let's use a small inline customized component approach defined outside or standard state.
                            // ACTUALLY, sticking state in the main component is safest.
                            // See 'currentImageIndex' added below.
                            
                            const currentImg = sliderImages[currentImageIndex] || sliderImages[0];
                            
                            return (
                                <>
                                    <img 
                                        src={currentImg} 
                                        alt={selectedPet.pet_name} 
                                        className="w-full h-full object-cover transition-opacity duration-300"
                                    />
                                    
                                    {/* Navigation Arrows */}
                                    {sliderImages.length > 1 && (
                                        <>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCurrentImageIndex(prev => (prev === 0 ? sliderImages.length - 1 : prev - 1));
                                                }}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <ChevronLeft size={24} />
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCurrentImageIndex(prev => (prev === sliderImages.length - 1 ? 0 : prev + 1));
                                                }}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <ChevronRight size={24} />
                                            </button>
                                            
                                            {/* Dots */}
                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                                {sliderImages.map((_, idx) => (
                                                    <div 
                                                        key={idx}
                                                        className={`w-2 h-2 rounded-full transition-all shadow-sm ${idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'}`}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </>
                            );
                        })()}
                        
                         <div className="absolute top-4 left-4 flex gap-2">
                            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-lg ${selectedPet.report_type === 'lost' ? 'bg-red-600 text-white' : selectedPet.status === 'sighted' ? 'bg-orange-500 text-white animate-pulse' : 'bg-green-500 text-white'}`}>
                                {selectedPet.status === 'lost' ? 'LOST' : selectedPet.status === 'sighted' ? 'SIGHTED' : 'FOUND'}
                            </span>
                        </div>
                    </div>

                    {/* Right: Info */}
                    <div className="md:w-1/2 p-8 overflow-y-auto max-h-[80vh] dark:text-slate-200">
                        <div className="mb-6">
                            <h2 className="text-4xl font-black text-slate-800 dark:text-white mb-2">{selectedPet.pet_name}</h2>
                            <p className="text-lg font-bold text-slate-500 dark:text-slate-400">{selectedPet.breed} • {selectedPet.gender} • {selectedPet.age || 'Unknown Age'}</p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide">Color: {selectedPet.primary_color}</span>
                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide">Size: {selectedPet.size}</span>
                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide">{selectedPet.coat_type} Coat</span>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Location */}
                            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                                <h3 className="text-xs font-black text-red-500 dark:text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <MapPin size={14} /> Last Seen
                                </h3>
                                <p className="font-bold text-slate-800 dark:text-white text-lg mb-1">{selectedPet.last_seen_location}</p>
                                <div className="flex gap-4 text-sm text-slate-500">
                                    <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(selectedPet.last_seen_date).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1"><Clock size={14} /> {selectedPet.last_seen_time || 'Time Unknown'}</span>
                                </div>
                            </div>

                            {/* Custody Info */}
                            {/* CUSTODY STATUS DISPLAY */}
                                {selectedPet.custody_status === 'rescuer_notified' && (
                                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mb-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Shield className="text-amber-600" size={20} />
                                            <h4 className="font-black text-amber-800 uppercase text-sm">Rescue Pickup Arranged</h4>
                                        </div>
                                        <p className="text-sm text-amber-900 mb-2">
                                            The finder cannot hold this pet. A request has been sent to:
                                        </p>
                                        {selectedPet.custody_rescuer_id && (
                                            <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-sm">
                                                <p className="font-bold text-amber-900 text-sm">
                                                    {rescuers.find(r => r.id === selectedPet.custody_rescuer_id)?.full_name || 'Shelter Oshe'}
                                                </p>
                                                <p className="text-xs text-amber-700 mt-1">Check with this organization for updates.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedPet.custody_status === 'pickup_scheduled' && (
                                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-6 animate-pulse-slow">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Truck className="text-emerald-600" size={20} />
                                            <h4 className="font-black text-emerald-800 uppercase text-sm">Pickup Scheduled</h4>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm space-y-2">
                                            <div className="flex items-center gap-2 text-emerald-900">
                                                <Calendar size={16} />
                                                <span className="font-bold">{selectedPet.pickup_date}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-emerald-900">
                                                <Clock size={16} />
                                                <span className="font-bold">{selectedPet.pickup_time}</span>
                                            </div>
                                            {selectedPet.pickup_note && (
                                                <div className="pt-2 border-t border-emerald-100 mt-2">
                                                    <p className="text-xs text-emerald-700 italic">" {selectedPet.pickup_note} "</p>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-emerald-600 mt-3 text-center font-medium">
                                            Rescuer/Shelter has accepted this request. They will pick up the pet and hold it until the owner claims it.
                                        </p>
                                    </div>
                                )}

                                {selectedPet.custody_status === 'in_shelter' && (
                                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Home className="text-blue-600" size={20} />
                                            <h4 className="font-black text-blue-800 uppercase text-sm">Safe In Shelter</h4>
                                        </div>
                                        <p className="text-sm text-blue-900">
                                            This pet has been picked up and is safe at the shelter/rescuer facility.
                                        </p>
                                    </div>
                                )}
                            {/* Details */}
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Details</h3>
                                <div className="space-y-2">
                                    <p className="text-sm font-bold text-slate-700">Distinctive Features</p>
                                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        {selectedPet.distinctive_features || selectedPet.description || "No specific details provided."}
                                    </p>
                                </div>
                                {selectedPet.temperament && (
                                     <div className="mt-3">
                                        <p className="text-sm font-bold text-slate-700">Temperament</p>
                                        <p className="text-slate-600">{selectedPet.temperament}</p>
                                     </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="pt-6 border-t border-slate-100 flex flex-col gap-3">
                                {session?.user?.id !== selectedPet.owner_id && (
                                    <>
                                        <button 
                                            onClick={() => {
                                                openChat(selectedPet.owner_id);
                                                // Optional: close modal? setSelectedPet(null); 
                                                // keeping open allows context
                                            }}
                                            className="w-full bg-rose-500 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-rose-600 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-1 transform transition-all"
                                        >
                                            <MessageCircle size={20} /> Message Owner
                                        </button>

                                        {!selectedPet.hide_contact && (
                                            <a href={`tel:${selectedPet.contact_phone}`} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-1 transform transition-all">
                                                <Phone size={20} /> Call Owner
                                            </a>
                                        )}
                                    </>
                                )}
                                
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => generateFlyer(selectedPet, selectedPet.image_url)}
                                        className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Download size={18} /> Download Poster
                                    </button>
                                     <button 
                                        className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Share2 size={18} /> Share
                                    </button>
                                </div>

                                {/* CLAIM PET BUTTON (For Owners finding their pets) */}
                                {selectedPet.report_type === 'found' && user && user.id !== selectedPet.owner_id && (
                                    <button 
                                        onClick={() => openClaimModal(selectedPet)}
                                        className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg shadow-indigo-200 hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Heart size={20} className="fill-white" />
                                        I am the Real Owner
                                    </button>
                                )}

                                {/* REPORT SIGHTING BUTTON (For non-owners on LOST pets) */}
                                {selectedPet.status === 'lost' && user && user.id !== selectedPet.owner_id && (
                                    <button 
                                        onClick={openSightingModal}
                                        className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-200 hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Eye size={20} className="text-white" />
                                        I Saw This Pet
                                    </button>
                                )}

                                {/* OWNER ACTIONS */}
                                {session?.user?.id === selectedPet.owner_id && (
                                    <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
                                        <p className="text-xs font-bold text-slate-400 uppercase text-center mb-3">Owner Actions</p>
                                        <button 
                                            onClick={() => handleMarkReunitedFromModal(selectedPet.id)}
                                            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition-all hover:-translate-y-1"
                                        >
                                            <CheckCircle size={20} /> Mark as Reunited
                                        </button>
                                    </div>
                                )}

                                {/* OWNER VIEW: SIGHTINGS */}
                                {session?.user?.id === selectedPet.owner_id && sightings.length > 0 && (
                                    <div id="sightings-section" className="mt-6 pt-6 border-t border-slate-200">
                                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                                            <Eye size={16} className="text-orange-500" /> 
                                            Reported Sightings ({sightings.length})
                                        </h4>
                                        <div className="space-y-4">
                                            {sightings.map(sighting => (
                                                <div key={sighting.id} className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-bold text-slate-800 dark:text-white text-sm">{sighting.sighting_location}</span>
                                                                {sighting.reporter_phone && (
                                                                    <a href={`tel:${sighting.reporter_phone}`} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 hover:bg-orange-200">
                                                                        <Phone size={10} /> {sighting.reporter_phone}
                                                                    </a>
                                                                )}
                                                                {sighting.reporter_id && sighting.reporter_id !== user?.id && (
                                                                     <button 
                                                                        onClick={() => openChat(sighting.reporter_id)}
                                                                        className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 hover:bg-rose-200"
                                                                     >
                                                                         <MessageCircle size={10} /> Chat
                                                                     </button>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-500">
                                                                {new Date(sighting.sighting_date).toLocaleDateString()} at {sighting.sighting_time} 
                                                                {sighting.reporter && (
                                                                    <span className="ml-1">by 
                                                                        <button 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                navigate(`/profile/${sighting.reporter.id}`);
                                                                            }}
                                                                            className="font-bold ml-1 hover:underline hover:text-orange-600 transition-colors"
                                                                        >
                                                                            {sighting.reporter.full_name || 'User'}
                                                                        </button>
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                        {sighting.image_url && (
                                                            <a href={sighting.image_url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-orange-600 hover:underline">View Photo</a>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{sighting.description}"</p>
                                                    {sighting.image_url && (
                                                        <div className="mt-2 h-24 w-full rounded-lg overflow-hidden relative">
                                                            <img src={sighting.image_url} className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* RESCUER ACTIONS (Accept Custody) */}
                                {session?.user?.id === selectedPet.custody_rescuer_id && selectedPet.custody_status === 'rescuer_notified' && (
                                     <div className="mt-4 pt-4 border-t border-dashed border-amber-200">
                                        <p className="text-xs font-bold text-amber-500 uppercase text-center mb-3">Rescuer Actions</p>
                                        <button 
                                            onClick={() => openPickupModal(selectedPet.id)}
                                            className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-200 transition-all hover:-translate-y-1"
                                        >
                                            <Shield size={20} /> Accept & Schedule Pickup
                                        </button>
                                        <p className="text-center text-xs text-slate-400 mt-2">This will notify the finder you are coming.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}




      {/* SUCCESS MODAL OVERLAY */}
      {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl transform scale-100 transition-all text-center border dark:border-slate-700">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 dark:text-green-400 shadow-sm">
                      <CheckCircle size={40} />
                  </div>
                  <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Report Broadcasted!</h2>
                  <p className="text-slate-500 dark:text-slate-400 mb-8 text-lg">
                      Your alert has been sent to all nearby users, rescuers, and vet clinics.
                  </p>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 mb-8">
                      <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2 flex items-center justify-center gap-2">
                          <FileText size={20} /> Generate Missing Poster?
                      </h3>
                      <p className="text-blue-700/80 dark:text-blue-300/80 text-sm mb-0">
                          We can instantly create a printable PDF flyer for you to share physically.
                      </p>
                  </div>

                  <div className="flex flex-col gap-3">
                      <button 
                          onClick={() => handleSuccessModalClose(true)}
                          className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-xl shadow-blue-200 hover:-translate-y-1 transition-transform flex items-center justify-center gap-2"
                      >
                          <Download size={20} /> Yes, Generate Flyer
                      </button>
                      <button 
                          onClick={() => handleSuccessModalClose(false)}
                          className="w-full py-4 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-colors"
                      >
                          No, Skip for Now
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Pickup Schedule Modal */}
      {showPickupModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden max-w-md w-full shadow-2xl relative p-8 border dark:border-slate-700">
                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
                           <Truck size={32} />
                      </div>
                      <h2 className="text-2xl font-black text-slate-800 dark:text-white">Schedule Pickup</h2>
                      <p className="text-slate-500 dark:text-slate-400 mt-2">When will you pick up this pet?</p>
                  </div>

                  <div className="space-y-4 mb-8">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Date</label>
                          <input 
                              type="date" 
                              className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-3 font-bold text-slate-700 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                              value={pickupDate}
                              onChange={(e) => setPickupDate(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Time</label>
                          <input 
                              type="time" 
                              className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-3 font-bold text-slate-700 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                              value={pickupTime}
                              onChange={(e) => setPickupTime(e.target.value)}
                          />
                      </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Note for Finder (Optional)</label>
                          <textarea 
                              className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-3 font-medium text-slate-600 dark:text-slate-300 outline-none focus:border-emerald-500 transition-colors resize-none h-20"
                              placeholder="e.g. I'll be in a marked van..."
                              value={pickupNote}
                              onChange={(e) => setPickupNote(e.target.value)}
                          />
                      </div>
                  </div>

                  <div className="flex flex-col gap-3">
                      <button 
                          onClick={submitPickupSchedule}
                          className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-lg shadow-xl shadow-emerald-200 hover:-translate-y-1 transition-transform"
                      >
                          Confirm Schedule
                      </button>
                      <button 
                          onClick={() => setShowPickupModal(false)}
                          className="w-full py-4 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-colors"
                      >
                          Cancel
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="container mx-auto max-w-5xl">
          
        {/* Header */}
        <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400">
                Lost & Found Network
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Rapid response network for missing pets. Report immediately to broadcast alerts to neighbors, rescuers, and local shelters.
            </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-10">
            <div className="bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-md inline-flex border border-slate-100 dark:border-slate-700">
                <button 
                    onClick={() => setActiveTab('alerts')}
                    className={`px-8 py-3 rounded-full font-bold transition-all text-sm flex items-center gap-2 ${activeTab === 'alerts' ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                    <AlertTriangle size={18} /> Active Feed
                </button>
                <button 
                    onClick={() => setActiveTab('report')}
                    className={`px-8 py-3 rounded-full font-bold transition-all text-sm flex items-center gap-2 ${activeTab === 'report' ? 'bg-red-600 text-white shadow-lg shadow-red-200 dark:shadow-red-900/20' : 'text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                >
                    <FileText size={18} /> File a Report
                </button>
                <button 
                    onClick={() => setActiveTab('reunited')}
                    className={`px-8 py-3 rounded-full font-bold transition-all text-sm flex items-center gap-2 ${activeTab === 'reunited' ? 'bg-green-500 text-white shadow-lg shadow-green-200 dark:shadow-green-900/20' : 'text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                >
                    <Heart size={18} /> Reunited
                </button>
            </div>
        </div>

        {activeTab === 'alerts' || activeTab === 'reunited' ? (
            <div className="flex flex-col gap-6">
            {activeTab === 'reunited' && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 text-green-800 dark:text-green-300 px-6 py-4 rounded-2xl mb-6 flex items-center gap-3">
                    <Clock size={20} className="shrink-0" />
                    <p className="text-sm font-medium">
                        Reunited pets are celebrated here for 5 days exactly from the moment they are marked as found, before being automatically archived.
                    </p>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lostPets.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400">
                        <CheckCircle size={64} className="mx-auto mb-4 text-green-500 opacity-50" />
                        <h3 className="text-2xl font-bold text-slate-600">All Quiet</h3>
                        <p>No active lost pet reports in your area.</p>
                    </div>
                )}
                {lostPets.map(pet => (
                    <div 
                        key={pet.id} 
                        // Modified to remove inline glassCardStyle to allow Tailwind classes to control dark mode
                        className="group overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer bg-white/85 dark:bg-slate-800/85 backdrop-blur-md rounded-[1.5rem] border border-white/60 dark:border-slate-700 shadow-sm"
                        onClick={() => openPetDetail(pet)}
                    >
                        <div className="relative h-64 bg-slate-200">
                            {pet.image_url ? (
                                <img src={pet.image_url} alt={pet.pet_name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <PawPrint size={48} />
                                </div>
                            )}
                            <div className="absolute top-4 left-4 flex flex-col gap-2">
                                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-lg w-fit ${pet.status === 'lost' ? 'bg-red-600 text-white' : pet.status === 'sighted' ? 'bg-orange-500 text-white animate-pulse' : 'bg-green-500 text-white'}`}>
                                    {pet.status === 'lost' ? 'LOST' : pet.status === 'sighted' ? 'SIGHTED' : 'FOUND'}
                                </span>
                                
                                {pet.custody_status === 'rescuer_notified' && (
                                    <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg bg-amber-500 text-white w-fit flex items-center gap-1">
                                        <Truck size={12} /> Pickup Request
                                    </span>
                                )}
                                {pet.custody_status === 'pickup_scheduled' && (
                                    <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg bg-emerald-500 text-white w-fit flex items-center gap-1 animate-pulse">
                                        <Clock size={12} /> Pickup Scheduled
                                    </span>
                                )}
                            </div>
                            
                            {/* Admin/Owner Delete Button */}
                            {(profile?.is_admin || (user && user.id === pet.owner_id)) && (
                                <button 
                                    onClick={(e) => deletePet(pet.id, e)}
                                    className="absolute top-4 right-4 z-10 p-2 bg-white/90 text-red-500 rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-colors"
                                    title="Delete Report"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                        <div className="p-6">
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{pet.pet_name}</h3>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">{pet.breed} • {pet.gender} • {pet.size}</p>
                            
                            <div className="space-y-3 mb-6">
                                <div className="flex items-start gap-3">
                                    <MapPin size={18} className="text-red-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Last Seen</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{pet.last_seen_location}</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{new Date(pet.last_seen_date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Eye size={18} className="text-blue-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Distinguishing Features</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{pet.distinctive_features || pet.description || "Click for details"}</p>
                                    </div>
                                </div>

                                {pet.custody_status === 'rescuer_notified' && (
                                    <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-3">
                                        <div className="p-1.5 bg-amber-100 rounded-full text-amber-600 mt-0.5">
                                            <Shield size={14} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Pickup Arranged</p>
                                            <p className="text-xs text-amber-700">
                                                Rescuer <b>{rescuers.find(r => r.id === pet.custody_rescuer_id)?.full_name || 'Organization'}</b> has been notified to take custody.
                                            </p>
                                        </div>
                                    </div>
                                )}
                                
                                {pet.custody_status === 'pickup_scheduled' && (
                                    <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-3">
                                        <div className="p-1.5 bg-emerald-100 rounded-full text-emerald-600 mt-0.5">
                                            <CheckCircle size={14} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Pickup Confirmed</p>
                                            <p className="text-xs text-emerald-700">
                                                Rescuer/Shelter has accepted this pet until the owner picks it up.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2 group-hover:bg-slate-900 group-hover:text-white">
                                View Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            </div>
        ) : (
            <div className="max-w-3xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-8">
                    
                    {/* A. CORE IDENTITY */}
                    <Section title="A. Core Identity">
                        <div className="flex justify-center mb-6">
                            <div className="bg-slate-100 p-1 rounded-lg flex items-center">
                                <button type="button" onClick={() => setReportType('lost')} className={`px-6 py-2 rounded-md font-bold text-sm transition-all ${reportType === 'lost' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500'}`}>I Lost a Pet</button>
                                <button type="button" onClick={() => setReportType('found')} className={`px-6 py-2 rounded-md font-bold text-sm transition-all ${reportType === 'found' ? 'bg-green-500 text-white shadow-md' : 'text-slate-500'}`}>I Found a Pet</button>
                            </div>
                        </div>

                        {/* Mode Explanation */}
                        <div className={`mb-8 p-4 rounded-xl border ${reportType === 'lost' ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                            <div className="flex gap-3">
                                <div className={`p-2 rounded-full h-fit ${reportType === 'lost' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                    {reportType === 'lost' ? <AlertTriangle size={20} /> : <Search size={20} />}
                                </div>
                                <div>
                                    <h3 className={`font-bold mb-1 ${reportType === 'lost' ? 'text-red-900' : 'text-green-900'}`}>
                                        {reportType === 'lost' ? 'Reporting a Missing Pet' : 'Reporting a Found Animal'}
                                    </h3>
                                    <p className={`text-sm leading-relaxed ${reportType === 'lost' ? 'text-red-700' : 'text-green-700'}`}>
                                        {reportType === 'lost' 
                                            ? "Select this if your own pet is missing. We will broadcast an immediate alert to nearby users, vet clinics, and rescuers. You can also generate a missing poster instantly."
                                            : "Select this if you have found a stray or lost animal. Please report their location and physical details to help the owner find them. If you can't hold the animal, this alert will notify rescuers."
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputGroup label="Pet Name" info={reportType === 'found' ? 'Check box if name is unknown' : ''}>
                                <div className="space-y-2">
                                    <input 
                                        className={`input-field ${nameUnknown ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`} 
                                        value={petName} 
                                        onChange={e => setPetName(e.target.value)} 
                                        required 
                                        disabled={nameUnknown}
                                        placeholder={nameUnknown ? "Name Unknown" : "Pet's Name"} 
                                    />
                                    {reportType === 'found' && (
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={nameUnknown} 
                                                onChange={handleNameUnknownChange}
                                                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300"
                                            />
                                            <span className="text-xs font-bold text-slate-500">I don't know the name (Use "Unknown")</span>
                                        </label>
                                    )}
                                </div>
                            </InputGroup>
                            
                            <InputGroup label="Species">
                                <select className="input-field" value={species} onChange={e => setSpecies(e.target.value)}>
                                    <option>Dog</option>
                                    <option>Cat</option>
                                    <option>Bird</option>
                                    <option>Rabbit</option>
                                    <option>Reptile</option>
                                    <option>Other</option>
                                </select>
                            </InputGroup>

                            <InputGroup label="Primary Breed">
                                <input className="input-field" value={breed} onChange={e => setBreed(e.target.value)} placeholder="e.g. Golden Retriever" list="breeds" />
                                <datalist id="breeds">
                                    <option value="Labrador" />
                                    <option value="German Shepherd" />
                                    <option value="Persian Cat" />
                                    <option value="Siamese" />
                                    {/* Add more common breeds */}
                                </datalist>
                            </InputGroup>

                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup label="Gender">
                                    <select className="input-field" value={gender} onChange={e => setGender(e.target.value)}>
                                        <option>Male</option>
                                        <option>Female</option>
                                        <option>Unknown</option>
                                    </select>
                                </InputGroup>
                                <InputGroup label="Size">
                                    <select className="input-field" value={size} onChange={e => setSize(e.target.value)}>
                                        <option>Small (0-20lbs)</option>
                                        <option>Medium (21-50lbs)</option>
                                        <option>Large (51+lbs)</option>
                                    </select>
                                </InputGroup>
                            </div>
                        </div>
                    </Section>

                    {/* B. VISUAL DETAILS */}
                    <Section title="B. Visual Details">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <InputGroup label="Colors">
                                <div className="grid grid-cols-2 gap-2">
                                    <input className="input-field" placeholder="Primary (e.g. Black)" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} required />
                                    <input className="input-field" placeholder="Secondary (e.g. White)" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} />
                                </div>
                            </InputGroup>
                            <InputGroup label="Coat Type">
                                <select className="input-field" value={coatType} onChange={e => setCoatType(e.target.value)}>
                                    <option value="">Select Coat...</option>
                                    <option>Short / Smooth</option>
                                    <option>Long / Fluffy</option>
                                    <option>Wire-haired</option>
                                    <option>Curly</option>
                                    <option>Hairless</option>
                                </select>
                            </InputGroup>
                            <div className="md:col-span-2">
                                <InputGroup label="Distinctive Features" info="E.g. One white paw, crooked tail, red collar">
                                    <textarea className="input-field h-24 resize-none" value={distinctiveFeatures} onChange={e => setDistinctiveFeatures(e.target.value)} placeholder="Describe any unique markings, collars, or accessories..."></textarea>
                                </InputGroup>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Photos (Max 3)</label>
                            <div className="grid grid-cols-4 gap-4">
                                {images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
                                        <img src={img.preview} className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-white p-1 rounded-full text-red-500"><X size={12} /></button>
                                    </div>
                                ))}
                                {images.length < 3 && (
                                    <>
                                        <div 
                                            onClick={() => cameraInputRef.current?.click()}
                                            className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-orange-50 hover:border-orange-400 transition-colors group"
                                        >
                                            <Camera className="text-slate-400 group-hover:text-orange-500 mb-2 transition-colors" />
                                            <span className="text-[10px] font-bold text-slate-400 group-hover:text-orange-500">Camera</span>
                                        </div>
                                        <div 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-colors group"
                                        >
                                            <Upload className="text-slate-400 group-hover:text-blue-500 mb-2 transition-colors" />
                                            <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-500">Upload</span>
                                        </div>
                                    </>
                                )}
                            </div>
                            <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
                            <input ref={cameraInputRef} type="file" multiple accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
                        </div>
                    </Section>

                    {/* C. THE INCIDENT */}
                    <Section title="C. The Incident">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <InputGroup label="Date Lost/Found">
                                <input 
                                    type="date" 
                                    className={`input-field ${dateError ? 'border-red-500 focus:border-red-500' : ''}`}
                                    value={lastSeenDate} 
                                    onChange={handleDateChange} 
                                    max={new Date().toISOString().split('T')[0]}
                                    required 
                                />
                                {dateError && <p className="text-xs text-red-500 font-bold mt-1">{dateError}</p>}
                            </InputGroup>
                            <InputGroup label="Time">
                                <input type="time" className="input-field" value={lastSeenTime} onChange={e => setLastSeenTime(e.target.value)} />
                            </InputGroup>
                        </div>
                        
                        <div className="mb-6">
                            <InputGroup label="Location" info="Drop a pin on the map where last seen">
                                <div className="h-56 rounded-2xl overflow-hidden border-2 border-white shadow-sm mb-3">
                                    <MapPicker onLocationSelect={(loc) => setCoords(loc)} />
                                </div>
                                <input className="input-field" placeholder="Cross streets, landmark, or address..." value={locationName} onChange={e => setLocationName(e.target.value)} required />
                            </InputGroup>
                        </div>

                        <InputGroup label="Temperament" info="Helps rescuers approach safely">
                            <div className="flex gap-2">
                                {['Friendly', 'Scared/Skittish', 'Aggressive/Do Not Approach'].map(t => (
                                    <button 
                                        key={t} 
                                        type="button" 
                                        onClick={() => setTemperament(t)}
                                        className={`flex-1 py-3 rounded-lg text-xs font-bold border transition-colors ${temperament === t ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </InputGroup>
                    </Section>

                    {/* D. SECURITY & CONTACT */}
                    <Section title="D. Security & Contact">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <InputGroup label="Contact Phone">
                                <input type="tel" className="input-field" value={contactPhone} onChange={e => setContactPhone(e.target.value)} required placeholder="(+94) 76 123 4567" />
                            </InputGroup>
                        </div>
                        
                        <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-xl border border-yellow-100 text-yellow-800">
                            {hideContact ? <Lock size={20} /> : <Unlock size={20} />}
                            <div className="flex-1">
                                <p className="font-bold text-sm">Privacy Selection</p>
                                <p className="text-xs opacity-80">Hide phone number on public feed?</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={hideContact} onChange={e => setHideContact(e.target.checked)} />
                                <div className="w-11 h-6 bg-yellow-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                            </label>
                        </div>
                    </Section>

                    {/* E. FOUND PET ACTIONS (Custody & Health) */}
                    {reportType === 'found' && (
                        <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-white/80 shadow-sm">
                            <h3 className="text-lg font-black text-slate-800 mb-6 uppercase tracking-wide border-b border-slate-100 pb-2">E. Found Pet Actions</h3>
                            
                            {/* Custody Selector */}
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Custody Status</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setCustodyStatus('user_holding')}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${custodyStatus === 'user_holding' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-200'}`}
                                    >
                                        <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
                                            <Shield size={18} className={custodyStatus === 'user_holding' ? 'text-emerald-600' : 'text-slate-400'} />
                                            I can hold the pet
                                        </div>
                                        <p className="text-xs text-slate-500">I will keep them safe until the owner is found.</p>
                                    </button>

                                    <button 
                                        type="button"
                                        onClick={() => setCustodyStatus('rescuer_notified')}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${custodyStatus === 'rescuer_notified' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white hover:border-amber-200'}`}
                                    >
                                        <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
                                            <CheckCircle size={18} className={custodyStatus === 'rescuer_notified' ? 'text-amber-600' : 'text-slate-400'} />
                                            I need a Rescuer/Shelter
                                        </div>
                                        <p className="text-xs text-slate-500">I cannot hold the pet. Notify a professional to pick them up.</p>
                                    </button>
                                </div>
                            </div>

                            {/* Rescuer Select (Only if needed) */}
                            {custodyStatus === 'rescuer_notified' && (
                                <div className="mb-6 p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                                    <InputGroup label="Select Rescuer/Shelter to Notify">
                                        <select 
                                            value={selectedRescuer}
                                            onChange={(e) => setSelectedRescuer(e.target.value)}
                                            required={custodyStatus === 'rescuer_notified'}
                                            className="input-field"
                                        >
                                            <option value="">Select a nearby rescuer...</option>
                                            {rescuers.map(r => (
                                                <option key={r.id} value={r.id}>{r.full_name || 'Organization'} ({r.location || 'Unknown Area'})</option>
                                            ))}
                                        </select>
                                    </InputGroup>
                                </div>
                            )}

                            {/* Injury Toggle */}
                            <div className="pt-4 border-t border-slate-100">
                                <div className="flex items-center gap-3 mb-4">
                                     <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={isInjured} onChange={e => setIsInjured(e.target.checked)} />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                                    </label>
                                    <div>
                                        <p className={`font-bold text-sm ${isInjured ? 'text-rose-600' : 'text-slate-600'}`}>Is the animal injured?</p>
                                        <p className="text-xs text-slate-400">Enable this to provide medical details.</p>
                                    </div>
                                </div>

                                {isInjured && (
                                    <div className="space-y-4">
                                        <InputGroup label="Injury Details">
                                            <textarea 
                                                className="input-field h-24 resize-none border-rose-200 focus:ring-rose-500" 
                                                value={injuryDetails} 
                                                onChange={e => setInjuryDetails(e.target.value)} 
                                                placeholder="Describe visible injuries, bleeding, limping, etc..."
                                                required={isInjured}
                                            />
                                        </InputGroup>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Injury Photos (Optional)</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {injuryImages.map((img, index) => (
                                                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                                                        <img src={img.preview} alt="Injury" className="w-full h-full object-cover" />
                                                        <button 
                                                            type="button"
                                                            onClick={() => removeInjuryImage(index)}
                                                            className="absolute top-1 right-1 p-1 bg-white/90 text-rose-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {injuryImages.length < 3 && (
                                                    <>
                                                        <div 
                                                            onClick={() => injuryCameraInputRef.current?.click()}
                                                            className="aspect-square rounded-lg border-2 border-dashed border-rose-200 hover:border-rose-400 hover:bg-rose-50 transition-all flex flex-col items-center justify-center cursor-pointer text-rose-400 group"
                                                        >
                                                            <Camera size={20} className="group-hover:scale-110 transition-transform" />
                                                            <span className="text-[10px] font-bold mt-1">Camera</span>
                                                        </div>
                                                        <div 
                                                            onClick={() => injuryFileInputRef.current?.click()}
                                                            className="aspect-square rounded-lg border-2 border-dashed border-rose-200 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center cursor-pointer text-rose-400 hover:text-blue-500 group"
                                                        >
                                                            <Upload size={20} className="group-hover:scale-110 transition-transform" />
                                                            <span className="text-[10px] font-bold mt-1">Upload</span>
                                                        </div>
                                                    </>
                                                )}
                                                <input ref={injuryFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleInjuryImageChange} />
                                                <input ref={injuryCameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInjuryImageChange} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {msg && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 font-bold ${msg.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {msg.type === 'error' ? <AlertTriangle /> : <CheckCircle />}
                            {msg.text}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-xl shadow-xl shadow-red-200 hover:shadow-2xl transform hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                    >
                        {loading ? 'Processing...' : (
                            <>
                                <Send size={24} />
                                Broadcast {reportType === 'lost' ? 'Lost Pet' : 'Found Pet'} Alert
                            </>
                        )}
                    </button>
                    <p className="text-center text-xs text-slate-400 mt-2">
                        Submitting triggers a notification to all users in the radius.
                    </p>

                </form>
            </div>
        )}
      </div>
      <style>{inputFieldStyles}</style>


      {/* CLAIM CONFIRMATION MODAL */}
      {showClaimModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowClaimModal(false)} />
            <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] border dark:border-slate-700">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 text-center shrink-0">
                    <h3 className="text-xl font-black text-white mb-1">Claim This Pet</h3>
                    <p className="text-indigo-100 text-xs">Help the finder verify you are the real owner.</p>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Your Name</label>
                            <input 
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                                value={claimName}
                                onChange={e => setClaimName(e.target.value)}
                                placeholder="Full Name"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Contact Info</label>
                            <input 
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                                value={claimContact}
                                onChange={e => setClaimContact(e.target.value)}
                                placeholder="Phone number or Email"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Proof Details <span className="text-red-500">*</span></label>
                            <textarea 
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-none text-slate-800 dark:text-white"
                                value={claimProof}
                                onChange={e => setClaimProof(e.target.value)}
                                placeholder="Describe unique markings, collar, nicknames, or behavior..."
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Proof Image (Optional)</label>
                            <div 
                                onClick={() => claimFileRef.current.click()}
                                className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                            >
                                {claimImage ? (
                                    <div className="text-center">
                                        <span className="text-sm font-bold text-indigo-600 truncate max-w-[200px] block">{claimImage.name}</span>
                                        <span className="text-xs text-slate-400">Click to change</span>
                                    </div>
                                ) : (
                                    <>
                                        <Camera className="text-slate-400 mb-2" />
                                        <span className="text-xs font-bold text-slate-400">Upload Photo of You + Pet</span>
                                    </>
                                )}
                            </div>
                            <input ref={claimFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setClaimImage(e.target.files[0])} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <button 
                            onClick={() => setShowClaimModal(false)}
                            className="py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmClaimPet}
                            className="py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            Submit Claim <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* SIGHTING REPORT MODAL */}
      {showSightingModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowSightingModal(false)} />
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border dark:border-slate-700 max-h-[90vh] flex flex-col">
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-center shrink-0">
                    <h3 className="text-xl font-black text-white mb-1">Report a Sighting</h3>
                    <p className="text-orange-50 text-xs">Help bring {selectedPet?.pet_name} home!</p>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <form onSubmit={handleSightingSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Date</label>
                                <input 
                                    type="date"
                                    required
                                    className={`w-full bg-slate-50 dark:bg-slate-700/50 border ${sightingDateError ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} rounded-xl px-4 py-3 font-medium text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-500`}
                                    value={sightingDate}
                                    onChange={handleSightingDateChange}
                                    max={new Date().toISOString().split('T')[0]}
                                />
                                {sightingDateError && <p className="text-xs text-red-500 font-bold mt-1">{sightingDateError}</p>}
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Time</label>
                                <input 
                                    type="time"
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 font-medium text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                                    value={sightingTime}
                                    onChange={e => setSightingTime(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Your Phone Number</label>
                            <input 
                                type="tel"
                                required
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 font-medium text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="Enter your contact number"
                                value={reporterPhone}
                                onChange={e => setReporterPhone(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Location Details</label>
                            <input 
                                required
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 font-medium text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="Street name, landmark, etc."
                                value={sightingLocation}
                                onChange={e => setSightingLocation(e.target.value)}
                            />
                        </div>

                        {/* Basic Location Picker Reuse if possible, else simplified */}
                        {/* We'll stick to text for MVP unless user specifically asked for map here, 
                            but map picker usage in modal might be cramped. keeping it simple for now. */}

                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Description</label>
                            <textarea 
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 font-medium text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 h-24 resize-none"
                                placeholder="Was the pet moving? Injured? Friendly?"
                                value={sightingDescription}
                                onChange={e => setSightingDescription(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Photo (Highly Recommended)</label>
                            <div 
                                onClick={() => sightingFileRef.current.click()}
                                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-orange-50 dark:hover:bg-slate-700 hover:border-orange-300 transition-colors"
                            >
                                {sightingImage ? (
                                    <div className="text-center relative w-full">
                                         <span className="text-sm font-bold text-orange-600 truncate max-w-[200px] block mx-auto underline">{sightingImage.name}</span>
                                         <button type="button" onClick={(e) => { e.stopPropagation(); setSightingImage(null); }} className="text-xs text-red-500 mt-1">Remove</button>
                                    </div>
                                ) : (
                                    <>
                                        <Camera className="text-slate-400 mb-2" />
                                        <span className="text-xs font-bold text-slate-400">Click to Upload Photo</span>
                                    </>
                                )}
                            </div>
                            <input ref={sightingFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setSightingImage(e.target.files[0])} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <button 
                                type="button"
                                onClick={() => setShowSightingModal(false)}
                                className="py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={loading}
                                className="py-3 rounded-xl bg-orange-500 text-white font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {loading ? 'Sending...' : 'Report Sighting'} <Send size={16} />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      )}

      {/* HOORAY MODAL */}
      {showHoorayModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
               <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {/* Simple CSS Confetti (or placeholder for effect) */}
               </div>
               <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-10 max-w-md w-full shadow-2xl text-center relative overflow-hidden border dark:border-slate-700">
                   <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-400"></div>
                   
                   <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1, rotate: 360 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="w-24 h-24 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500 dark:text-rose-400 shadow-inner"
                    >
                       <Heart size={48} fill="currentColor" />
                   </motion.div>
                   
                   <h2 className="text-4xl font-black text-slate-800 dark:text-white mb-2">Hooray!</h2>
                   <p className="text-lg text-slate-500 dark:text-slate-400 mb-8 font-medium">
                       Another tail wagging happily. Thank you for being a hero! 
                   </p>
                   
                   <button 
                        onClick={() => { setShowHoorayModal(false); setActiveTab('reunited'); }}
                        className="w-full bg-slate-900 dark:bg-slate-700 text-white font-bold py-4 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-lg hover:translate-y-[-2px]"
                    >
                       See Reunited Pets
                   </button>
               </div>
          </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmation.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100 dark:border-slate-700 transform transition-all scale-100">
                   <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                       <Trash2 size={32} />
                   </div>
                   
                   <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Delete Report?</h3>
                   <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed">
                       Are you sure you want to delete this report? This action cannot be undone.
                   </p>
                   
                   <div className="grid grid-cols-2 gap-3">
                       <button 
                            onClick={() => setDeleteConfirmation({ isOpen: false, petId: null })}
                            className="py-3 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                           Cancel
                       </button>
                       <button 
                            onClick={confirmDelete}
                            className="py-3 rounded-xl bg-red-500 text-white font-bold shadow-lg shadow-red-200 hover:bg-red-600 transition-all active:scale-95"
                        >
                           Delete
                       </button>
                   </div>
               </div>
          </div>
      )}

    </div>
  );
}

// Helpers
const Section = ({ title, children }) => (
    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-6 rounded-2xl border border-white/80 dark:border-slate-700 shadow-sm">
        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700 pb-2">{title}</h3>
        {children}
    </div>
);

const InputGroup = ({ label, info, children }) => (
    <div>
        <div className="flex justify-between items-end mb-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</label>
            {info && <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{info}</span>}
        </div>
        {children}
    </div>
);
