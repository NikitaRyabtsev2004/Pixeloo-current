import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { checkAutoOpen, closeModal } from "../../redux/slices/rulesModalSlice";
import { RULES_TEXT } from "../../utils/helpers/constants";
import { useSettings } from "../../hooks/useSettings";

const RulesModal = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.rulesModal.isOpen);
  const modalContentRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { isSoundsOn } = useSettings();

  useEffect(() => {
    if (modalContentRef.current) {
      const content = modalContentRef.current;
      setShowScrollButton(content.scrollHeight > content.clientHeight);
    }
  }, [isOpen]);

  const handleScrollToBottom = () => {
    if (modalContentRef.current) {
      modalContentRef.current.scrollTop = modalContentRef.current.scrollHeight;
    }
  };

  const handleClose = () => {
    dispatch(closeModal({isSoundsOn}));
  };

  useEffect(() => {
  const isBot = /bot|googlebot|crawler|spider|robot|crawling/i.test(navigator.userAgent);
  if (!isBot) {
    dispatch(checkAutoOpen());
  }
}, [dispatch]);

  if (!isOpen) {
    return null; 
  }

  return (
    <div className="rules-modal" data-nosnippet>
      <h1>
        <div className="rules-modal__title">Правила:</div>
      </h1>
      <div
        className="rules-modal__content"
        ref={modalContentRef}
        style={{ maxHeight: "80vh", overflowY: "auto" }}
      >
        {RULES_TEXT.map((rule, index) => (
          <p
            key={index}
            className={
              rule.startsWith("Запрещено") || rule.includes("Просьба")
                ? "rules-modal__highlight"
                : "rules-modal__text"
            }
          >
            {rule}
          </p>
        ))}
      </div>

      {showScrollButton && (
        <button
          className="rules-modal__scroll-button"
          onClick={handleScrollToBottom}
        >
          ↓
        </button>
      )}

      <button className="modal__close-button" onClick={handleClose}>
        Закрыть
      </button>
    </div>
  );
};

export default RulesModal;
