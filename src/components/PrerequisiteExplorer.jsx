import React, { useMemo, useState } from 'react';
import { Math as MathEl } from './MathRenderer.jsx';
import { buildPrerequisitePath } from '../data/prerequisiteExplorer.js';
import './PrerequisiteExplorer.css';

export default function PrerequisiteExplorer({ question, method }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const nodes = useMemo(() => buildPrerequisitePath({
    question: question?.displayText || question?.latex || '',
    steps: method?.steps || [], diagnosis: method?.diagnosis || '',
    prerequisites: method?.prerequisiteConcepts?.length ? method.prerequisiteConcepts : method?.prerequisites || [],
  }), [question, method]);
  const active = nodes[selected];

  return (
    <section className="concept-explorer card" aria-labelledby="concept-explorer-title">
      <button className="concept-explorer-toggle" type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>
        <span><strong id="concept-explorer-title">Prerequisite concept explorer</strong><small>Review the ideas used in this problem</small></span>
        <span>{open ? 'Hide' : 'Explore'}</span>
      </button>
      {open && (nodes.length ? (
        <div className="concept-explorer-body">
          <div className="concept-path" role="list" aria-label="Prerequisite concepts">
            {nodes.map((node, index) => (
              <React.Fragment key={node.id}>
                {index > 0 && <span className="concept-path-link" aria-hidden="true" />}
                <button type="button" role="listitem" className={`concept-node ${index === selected ? 'selected' : ''}`} onClick={() => setSelected(index)} aria-pressed={index === selected}>
                  <span className="concept-node-number">{index + 1}</span>{node.title}
                </button>
              </React.Fragment>
            ))}
          </div>
          {active && <div className="concept-detail" aria-live="polite">
            <h3>{active.title}</h3>
            {active.explanation && <p>{active.explanation}</p>}
            {active.formula && <p className="concept-formula"><MathEl latex={active.formula} /></p>}
            {active.example && <p><span>Example</span><MathEl latex={active.example} /></p>}
            {!active.formula && !active.example && !active.explanation && <p>This is the goal concept for the submitted problem.</p>}
          </div>}
        </div>
      ) : <p className="concept-explorer-empty">No specific prerequisite path was identified for this problem.</p>)}
    </section>
  );
}
