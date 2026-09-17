import { useState, memo } from "react";
import { toE164, isValidE164 } from "./types";
import "./EmergencyContacts.css";

interface EmergencyContactsProps {
  contacts: string[];
  userMobile: string;
  onUpdateContacts: (contacts: string[]) => void;
  onClose: () => void;
}

function EmergencyContactsComponent({
  contacts,
  userMobile,
  onUpdateContacts,
  onClose,
}: EmergencyContactsProps) {
  const [newNumber, setNewNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  // State for changing Contact 1 (the mandatory contact)
  const [editingContact1, setEditingContact1] = useState(false);
  const [contact1Draft, setContact1Draft] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const userMobileNormalized = toE164(userMobile);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = newNumber.replace(/\D/g, "");
    if (!clean) return;

    if (clean.length < 10) {
      setError("Please enter a valid 10-digit mobile number (numbers only).");
      return;
    }

    const normalized = toE164(clean);

    if (!isValidE164(normalized)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (normalized === userMobileNormalized) {
      setError("You cannot add your own mobile number as an emergency contact.");
      return;
    }

    if (contacts.includes(normalized)) {
      setError("This phone number is already in your emergency contacts.");
      return;
    }

    if (contacts.length >= 5) {
      setError("Maximum 5 emergency contacts allowed.");
      return;
    }

    onUpdateContacts([...contacts, normalized]);
    setNewNumber("");
  };

  const handleRemove = (index: number) => {
    if (index === 0) {
      // Primary relative is mandatory and cannot be removed
      return;
    }
    const updated = contacts.filter((_, i) => i !== index);
    onUpdateContacts(updated);
  };

  const handleSaveContact1 = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    const clean = contact1Draft.replace(/\D/g, "");
    if (!clean) {
      setEditError("Primary emergency contact is required and cannot be empty.");
      return;
    }

    if (clean.length < 10) {
      setEditError("Please enter a valid 10-digit mobile number (numbers only).");
      return;
    }

    const normalized = toE164(clean);

    if (!isValidE164(normalized)) {
      setEditError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (normalized === userMobileNormalized) {
      setEditError("You cannot set your own mobile number as your primary emergency contact.");
      return;
    }

    // Check if duplicate of another existing contact (contacts[1..N])
    if (contacts.slice(1).includes(normalized)) {
      setEditError("This number is already in your additional contacts list.");
      return;
    }

    // Replace Contact 1 while preserving any additional contacts
    onUpdateContacts([normalized, ...contacts.slice(1)]);
    setEditingContact1(false);
    setEditError(null);
  };

  return (
    <div className="contacts-modal-backdrop" role="dialog" aria-modal="true" aria-label="Manage Emergency Contacts">
      <div className="contacts-modal-card">
        <div className="contacts-modal-header">
          <h2>📞 Emergency Contacts</h2>
          <button className="contacts-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="contacts-modal-body">
          <div className="contacts-info-banner">
            When you trigger an SOS, an alert SMS with your status and GPS location will be sent to all contacts below.
          </div>

          <div className="contacts-list">
            {contacts.map((phone, idx) => {
              // Special treatment for mandatory Contact 1
              if (idx === 0) {
                if (editingContact1) {
                  return (
                    <div key="contact-1-editing" className="contact-item locked">
                      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div className="contact-item-label">
                          <span>Change Primary Contact (Required)</span>
                          <span className="contact-badge-locked">🔒 Protected</span>
                        </div>
                        <form className="contact-edit-row" onSubmit={handleSaveContact1}>
                          <input
                            type="tel"
                            className="contact-edit-input"
                            value={contact1Draft}
                            onChange={(e) => {
                              const clean = e.target.value.replace(/\D/g, "");
                              setContact1Draft(clean);
                              if (editError) setEditError(null);
                            }}
                            placeholder="Enter 10-digit mobile number"
                            maxLength={10}
                            autoFocus
                          />
                          <button type="submit" className="contact-save-btn">
                            Save
                          </button>
                          <button
                            type="button"
                            className="contact-cancel-btn"
                            onClick={() => {
                              setEditingContact1(false);
                              setEditError(null);
                            }}
                          >
                            Cancel
                          </button>
                        </form>
                        {editError && <p className="contacts-error-text">⚠️ {editError}</p>}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key="contact-1" className="contact-item locked">
                    <div className="contact-item-info">
                      <div className="contact-item-label">
                        <span>Contact 1 (Closest Relative)</span>
                        <span className="contact-badge-locked">🔒 Primary Contact</span>
                      </div>
                      <div className="contact-item-phone">{phone}</div>
                    </div>

                    <button
                      type="button"
                      className="contact-edit-btn"
                      onClick={() => {
                        setEditingContact1(true);
                        setContact1Draft(contacts[0].replace(/\D/g, "").slice(-10));
                        setEditError(null);
                      }}
                      title="Update primary contact number"
                    >
                      ✏️ Change
                    </button>
                  </div>
                );
              }

              // Additional contacts (idx >= 1)
              return (
                <div key={phone + idx} className="contact-item">
                  <div className="contact-item-info">
                    <div className="contact-item-label">
                      <span>Contact {idx + 1}</span>
                    </div>
                    <div className="contact-item-phone">{phone}</div>
                  </div>

                  <button
                    type="button"
                    className="contact-delete-btn"
                    onClick={() => handleRemove(idx)}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          {contacts.length < 5 && (
            <form className="add-contact-form" onSubmit={handleAdd}>
              <label htmlFor="new-contact-input">Add Additional Emergency Contact</label>
              <div className="add-contact-row">
                <input
                  id="new-contact-input"
                  type="tel"
                  className="add-contact-input"
                  placeholder="10-digit mobile number"
                  value={newNumber}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, "");
                    setNewNumber(clean);
                    if (error) setError(null);
                  }}
                  maxLength={10}
                />
                <button type="submit" className="add-contact-btn">
                  Add
                </button>
              </div>
              {error && <p className="contacts-error-text">⚠️ {error}</p>}
            </form>
          )}
        </div>

        <div className="contacts-modal-footer">
          <button type="button" className="contacts-done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

const EmergencyContacts = memo(EmergencyContactsComponent);
export default EmergencyContacts;
