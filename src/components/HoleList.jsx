// src/components/HoleList.jsx
import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import HoleItem from './HoleItem';

export default function HoleList({
    holes,
    editingHoleData,
    setEditingHoleData,
    toggleEditing,
    saveHoleChanges,
    onDragEnd,
    deleteHole,
    discs, // <--- CRITICAL: Now receiving the 'discs' prop from Courses.jsx
}) {
    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="holes-list">
                {(provided) => (
                    <ul
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-4"
                    >
                        {/* Message for when there are no holes */}
                        {(!holes || holes.length === 0) && <li className="text-center text-gray-600 dark:text-gray-300 text-lg">No holes added yet.</li>}

                        {/* Map over holes to render HoleItem components */}
                        {holes && holes.filter(Boolean).map((hole, index) => (
                            <Draggable key={hole.id} draggableId={hole.id} index={index}>
                                {(providedDraggable) => (
                                    <HoleItem
                                        hole={hole}
                                        index={index}
                                        editingHoleData={editingHoleData}
                                        setEditingHoleData={setEditingHoleData}
                                        // The onToggleEdit prop in HoleItem expects the full hole object for accurate data initialization on edit.
                                        // Ensure toggleEditing from Courses.jsx receives this too.
                                        onToggleEdit={() => toggleEditing(hole.id, hole)}
                                        onSave={() => saveHoleChanges(hole.id)}
                                        onDelete={() => deleteHole(hole.id)}
                                        // Pass the draggable props down to the HoleItem
                                        draggableProps={providedDraggable.draggableProps}
                                        dragHandleProps={providedDraggable.dragHandleProps}
                                        innerRef={providedDraggable.innerRef}
                                        discs={discs} // <--- CRITICAL: Now passing the 'discs' prop to HoleItem
                                    />
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </ul>
                )}
            </Droppable>
        </DragDropContext>
    );
}