import { useState } from 'react';
import Modal from '../ui/Modal';
import StarRating from '../ui/StarRating';
import { useCreateReview } from '../../hooks/useClinical';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../api/client';

/** Patient rates a completed appointment (1-5 stars + optional comment). */
export default function ReviewModal({ appointment, onClose, onDone }) {
  const { showToast } = useToast();
  const createReview = useCreateReview();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    if (!rating) {
      setError('Please choose a rating from 1 to 5 stars.');
      return;
    }
    setError('');
    try {
      await createReview.mutateAsync({
        appointment_id: appointment.id,
        rating,
        comment: comment.trim() || null,
      });
      showToast('Thank you! Your review was submitted.', 'success');
      onDone?.('Thank you for your review.');
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Modal
      title={`Rate ${appointment.doctor?.full_name || 'your doctor'}`}
      onClose={onClose}
      busy={createReview.isPending}
      footer={(
        <>
          <button type="button" className="btn btn-light" onClick={onClose} disabled={createReview.isPending}>Not now</button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={createReview.isPending}>
            {createReview.isPending ? 'Sending…' : 'Submit review'}
          </button>
        </>
      )}
    >
      <div className="mb-3">
        <div className="form-label fw-semibold">Your rating</div>
        <StarRating value={rating} onChange={setRating} size={30} />
      </div>
      <label className="form-label fw-semibold" htmlFor="review-comment">Comment (optional)</label>
      <textarea
        id="review-comment"
        className="form-control"
        rows={4}
        maxLength={1000}
        placeholder="How was your visit?"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />
      {error && <div className="alert alert-danger mt-3 mb-0 py-2" role="alert">{error}</div>}
    </Modal>
  );
}
