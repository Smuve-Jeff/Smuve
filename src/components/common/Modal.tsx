import React from 'react';
import Button from './Button';

interface ModalProps {
  title: string;
  content: string;
  onClose: () => void;
  primaryButtonText?: string;
  primaryButtonAction?: () => void;
  primaryButtonIcon?: React.ReactNode;
  parseMarkdown?: (text: string) => string;
}

const defaultParseMarkdown = (text: string) => {
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\b/g, '<em>$1</em>') // Italics, ensuring word boundaries
      .replace(/`([^`]+)`/g, '<code class="bg-gray-700/70 rounded px-1 py-0.5 text-sm">$1</code>') // Inline code
      .replace(/(\r\n|\n|\r)/g, '<br />'); // Convert line breaks to <br />

    // Convert markdown lists to HTML lists
    // Handle unordered lists with '-' or '*'
    html = html.replace(/(<br \/>|^)[\s]*[\-\*]\s(.*?)(?=<br \/>[\s]*[\-\*]\s|<br \/>[\s]*\d+\.\s|<br \/>|$)/g, '<li>$2</li>');
    // Handle ordered lists with '1.', '2.' etc.
    html = html.replace(/(<br \/>|^)[\s]*(\d+)\.\s(.*?)(?=<br \/>[\s]*[\-\*]\s|<br \/>[\s]*\d+\.\s|<br \/>|$)/g, '<li>$3</li>');

    // Wrap consecutive <li> elements in <ul> or <ol> tags
    // This regex looks for one or more <li> tags potentially separated by <br />
    html = html.replace(/((?:<li>.*?<\/li>(?:<br \/>)?)+)/g, (match) => {
        // Check if it's an ordered list (starts with a number pattern, though now converted to <li>)
        // This is a heuristic; a more robust parser might track initial marker.
        // For simplicity here, we'll assume a block of <li> implies <ul> unless explicitly marked.
        // If the original markdown mixed list types, this might not be perfect.
        return `<ul>${match.replace(/<br \/>/g, '')}</ul>`;
    });
    
    // Clean up any extra <br /> tags directly preceding <ul> or after </ul>
    html = html.replace(/<br \/>(\s*<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)\s*<br \/>/g, '$1');

    // Handle headers (order matters: H3 before H2, H2 before H1)
    html = html.replace(/<br \/>###\s*(.*?)(<br \/>|$)/g, '<h4>$1</h4>');
    html = html.replace(/<br \/>##\s*(.*?)(<br \/>|$)/g, '<h3>$1</h3>');
    html = html.replace(/<br \/>#\s*(.*?)(<br \/>|$)/g, '<h2>$1</h2>');
    
    // Ensure all <br /> are correct (no double breaks unless intended by original markdown)
    html = html.replace(/(<br \/>){3,}/g, '<br /><br />'); // Collapse 3+ breaks to 2
    html = html.replace(/(<br \/>)\s*<br \/>/g, '<p></p>'); // Convert double breaks to paragraph breaks

    return html;
};

const Modal: React.FC<ModalProps> = React.memo(({ 
  title, 
  content, 
  onClose, 
  primaryButtonText, 
  primaryButtonAction,
  primaryButtonIcon,
  parseMarkdown = defaultParseMarkdown
}) => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 font-mono animate-fade-in" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="bg-gray-900 border border-green-500/50 rounded-lg shadow-lg p-6 max-w-lg w-full transform animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 id="modal-title" className="text-xl font-bold text-green-400 mb-4">{title}</h3>
            <div className="bg-gray-800/50 p-4 rounded-md text-green-300 whitespace-pre-wrap max-h-[60vh] overflow-y-auto custom-scrollbar prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{__html: parseMarkdown(content)}}></div>
            <div className="text-right mt-4 flex justify-end gap-2">
                {primaryButtonAction && primaryButtonText && (
                    <Button onClick={primaryButtonAction} icon={primaryButtonIcon} className="bg-green-600 hover:bg-green-500 focus:ring-green-500 text-black">
                        {primaryButtonText}
                    </Button>
                )}
                <Button onClick={onClose} variant="secondary" className="bg-gray-700/80 hover:bg-gray-600/80 text-gray-200">Close</Button>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                background: #00000030;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                background-color: #22c55e80;
                border-radius: 10px;
                border: 2px solid #00000030;
                }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scale-in {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out forwards;
                }
                .animate-scale-in {
                    animation: scale-in 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    </div>
));
Modal.displayName = 'Modal';

export default Modal;