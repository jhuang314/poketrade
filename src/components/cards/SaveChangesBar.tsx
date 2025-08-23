// src/components/cards/SaveChangesBar.tsx
interface SaveChangesBarProps {
   onSave: () => void;
   onDiscard: () => void;
}

export default function SaveChangesBar({ onSave, onDiscard }: SaveChangesBarProps) {
   return (
       <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 shadow-lg flex justify-center items-center gap-4">
           <p>You have unsaved changes.</p>
           <button onClick={onSave} className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded font-bold">Save Changes</button>
           <button onClick={onDiscard} className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded">Discard</button>
       </div>
   );
}
