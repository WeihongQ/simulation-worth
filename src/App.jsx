import { useState } from "react";
import twin2k from "./data/twin2k.json";
import Tabs from "./components/Tabs.jsx";
import Section1Comparison from "./components/Section1Comparison.jsx";
import Section2Worth from "./components/Section2Worth.jsx";
import Section3Domains from "./components/Section3Domains.jsx";
import Section4Budget from "./components/Section4Budget.jsx";
import Section5YourData from "./components/Section5YourData.jsx";
import Assumptions from "./components/Assumptions.jsx";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("gap");
  const [customDataset, setCustomDataset] = useState(null);

  const usingCustomData = customDataset !== null;
  const overall = customDataset?.overall ?? twin2k.overall;
  const domains = customDataset?.domains ?? twin2k.domains;

  const tabs = [
    { id: "gap", label: "The gap", content: <Section1Comparison domains={twin2k.domains} /> },
    {
      id: "worth",
      label: "What it's worth",
      content: <Section2Worth overall={overall} usingCustomData={usingCustomData} />,
    },
    {
      id: "trust",
      label: "Where it fails",
      content: <Section3Domains domains={domains} usingCustomData={usingCustomData} />,
    },
    {
      id: "budget",
      label: "Your budget",
      content: <Section4Budget domains={domains} overall={overall} usingCustomData={usingCustomData} />,
    },
    {
      id: "yours",
      label: "Try your data",
      content: (
        <Section5YourData
          onApply={setCustomDataset}
          onReset={() => setCustomDataset(null)}
          isActive={usingCustomData}
        />
      ),
    },
  ];

  return (
    <>
      <header className="page-header">
        <p className="kicker">A demo of prediction-powered inference</p>
        <h1>What is your LLM simulation actually worth?</h1>
        <p>
          LLM-simulated survey respondents (&ldquo;digital twins&rdquo;) are
          cheap, but not always accurate. That leaves researchers with a
          difficult tradeoff: recruit everyone and bear the full cost, or
          rely on simulation and risk getting the answer wrong. This demo
          takes a middle path &mdash; recruit a small sample of real
          respondents to measure how far off the simulation is, and then use
          that gap to correct the average from a large batch of simulations.
          The more reliable the simulation is, the fewer real respondents are
          needed to achieve the same precision. This allows the demo to show
          how much your simulation is actually worth and, given a budget, how
          many real respondents you still need to recruit.
        </p>
        <p className="citation">
          This demo is developed based on the method proposed by Broska,
          Howes &amp; van Loon (2025), &ldquo;The Mixed Subjects
          Design,&rdquo; <em>Sociological Methods &amp; Research</em>{" "}
          54(3):1074&ndash;1109.
          <br />
          Data source: Twin-2K-500 (LLM-Digital-Twin, HuggingFace).
          <br />
          This site is an independent, unofficial walkthrough of their idea
          &mdash; not affiliated with the authors.
        </p>
      </header>

      <main>
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        <Assumptions />
      </main>

      <footer className="page-footer">
        <p>
          Data: Twin-2K-500 (LLM-Digital-Twin, HuggingFace). Method: Broska,
          Howes &amp; van Loon (2025), &ldquo;The Mixed Subjects
          Design,&rdquo; <em>Sociological Methods &amp; Research</em> 54(3).
        </p>
      </footer>
    </>
  );
}

export default App;
