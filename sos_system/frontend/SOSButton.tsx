import { useState, memo } from "react";
import SOSModal from "./SOSModal";
import "./SOSButton.css";

/**
 * SOSButton — pulsing red FAB fixed to the bottom-right of the screen.
 * Clicking it opens the SOSModal (confirm → send → result).
 * Does NOT send any SMS directly on click.
 */
interface SOSButtonProps {
  contacts: string[];
  userName?: string;
}

function SOSButtonComponent({ contacts, userName }: SOSButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        className="sos-fab sos-scope"
        aria-label="Open SOS Emergency Alert"
        onClick={() => setModalOpen(true)}
        disabled={modalOpen}
      >
        🚨
        <br />
        SOS
      </button>

      {modalOpen && (
        <SOSModal
          contacts={contacts}
          userName={userName}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

const SOSButton = memo(SOSButtonComponent);
export default SOSButton;
