import React from 'react';

interface FormFieldsProps {
  form: {
    patient_name: string;
    phone: string;
    email: string;
    preferred_date: string;
    preferred_time_window: string;
    referring_doctor_name: string;
    message: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

export default function FormFields({ form, onChange }: FormFieldsProps) {
  return (
    <>
      <div className="form-group">
        <label>Patient Name *</label>
        <input
          name="patient_name"
          placeholder="Your full name"
          value={form.patient_name}
          onChange={onChange}
          required
          autoFocus
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Phone Number *</label>
          <div className="flex">
            <span className="inline-flex items-center px-3 bg-bg-alt border border-r-0 border-border rounded-l-lg text-sm text-text-light">
              +91
            </span>
            <input
              name="phone"
              type="tel"
              placeholder="9876543210"
              value={form.phone}
              onChange={onChange}
              required
              className="rounded-l-none !rounded-r-lg"
            />
          </div>
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            name="email"
            type="email"
            placeholder="email@example.com"
            value={form.email}
            onChange={onChange}
          />
          <p className="text-xs text-text-light mt-1">We'll primarily contact you by phone</p>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Preferred Date</label>
          <input
            name="preferred_date"
            type="date"
            value={form.preferred_date}
            onChange={onChange}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="form-group">
          <label>Preferred Time</label>
          <select name="preferred_time_window" value={form.preferred_time_window} onChange={onChange}>
            <option value="">Select time window</option>
            <option value="Morning (9am-12pm)">Morning (9am-12pm)</option>
            <option value="Afternoon (12pm-4pm)">Afternoon (12pm-4pm)</option>
            <option value="Evening (4pm-7pm)">Evening (4pm-7pm)</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Referring Doctor</label>
        <input
          name="referring_doctor_name"
          placeholder="Name of doctor who referred you (if any)"
          value={form.referring_doctor_name}
          onChange={onChange}
        />
      </div>

      <div className="form-group">
        <label>Message</label>
        <textarea name="message" value={form.message} onChange={onChange} />
      </div>
    </>
  );
}
