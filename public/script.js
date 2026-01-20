const socket = io();
const listsDiv = document.getElementById("lists");

function renderLists(teams) {
  console.log("Rendering teams:", teams); // Debug log
  listsDiv.innerHTML = "";

  for (const [team, items] of Object.entries(teams)) {
    const div = document.createElement("div");
    div.className = "team-container";
    
    // Team header with edit and delete buttons
    const header = document.createElement("div");
    header.className = "team-header";
    
    const h3 = document.createElement("h3");
    h3.textContent = team;
    h3.onclick = () => {
      const newName = prompt("Edit team name:", team);
      if (newName !== null && newName.trim() !== "" && newName !== team) {
        socket.emit("renameTeam", { oldName: team, newName: newName.trim() });
      }
    };
    h3.style.cursor = "pointer";
    h3.title = "Click to edit team name";
    
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "×";
    deleteBtn.className = "delete-team-btn";
    deleteBtn.onclick = () => {
      if (confirm(`Delete team "${team}" and all its items?`)) {
        socket.emit("deleteTeam", { team });
      }
    };
    deleteBtn.title = "Delete team";
    
    header.appendChild(h3);
    header.appendChild(deleteBtn);
    div.appendChild(header);
    
    const ul = document.createElement("ul");
    ul.className = "ranking-list";

    items.forEach((item, idx) => {
      const li = document.createElement("li");
      li.className = "rank-item";
      li.draggable = true;
      li.dataset.index = idx; // Store index in data attribute

      const rankSpan = document.createElement("span");
      rankSpan.className = "rank-number";
      rankSpan.textContent = `${idx + 1}.`;

      const textSpan = document.createElement("span");
      textSpan.textContent = `${item.text} (${item.number})`;

      li.appendChild(rankSpan);
      li.appendChild(textSpan);

      li.onclick = () => {
        const newValue = prompt("Edit item text:", item.text);
        const newNumber = prompt("Edit number:", item.number);
        if (newValue !== null && newNumber !== null) {
          socket.emit("editItem", {
            team,
            index: idx,
            newValue,
            newNumber: parseFloat(newNumber)
          });
        }
      };

      li.oncontextmenu = (e) => {
        e.preventDefault();
        if (confirm("Delete this item?"))
          socket.emit("deleteItem", { team, index: idx });
      };

      // FIX: Drag-and-drop bug fixed by using data attributes
      li.ondragstart = (e) => {
        e.dataTransfer.setData("text/plain", idx);
        e.dataTransfer.effectAllowed = "move";
      };
      
      ul.ondragover = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      };
      
      ul.ondrop = (e) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
        
        // Find the drop target by traversing up to find the li element
        let dropTarget = e.target;
        while (dropTarget && dropTarget.tagName !== "LI") {
          dropTarget = dropTarget.parentElement;
        }
        
        if (!dropTarget || !dropTarget.dataset.index) return;
        
        const toIndex = parseInt(dropTarget.dataset.index);
        
        if (fromIndex !== toIndex) {
          const newOrder = [...items];
          const moved = newOrder.splice(fromIndex, 1)[0];
          newOrder.splice(toIndex, 0, moved);
          socket.emit("reorder", { team, newOrder });
        }
      };

      ul.appendChild(li);
    });

    div.appendChild(ul);
    listsDiv.appendChild(div);
  }
}

socket.on("connect", () => {
  console.log("Socket connected"); // Debug log
});

socket.on("initData", (data) => {
  console.log("Received initData:", data); // Debug log
  renderLists(data);
});

socket.on("updateData", (data) => {
  console.log("Received updateData:", data); // Debug log
  renderLists(data);
});

function addItem() {
  const text = document.getElementById("newItem").value.trim();
  const number = parseFloat(document.getElementById("newNumber").value);
  if (!text) return alert("Enter an item name.");
  if (isNaN(number)) return alert("Enter a valid number.");

  socket.emit("addItem", { text, number });
  document.getElementById("newItem").value = "";
  document.getElementById("newNumber").value = "";
}

function addTeam() {
  const teamName = prompt("Enter new team name:");
  if (teamName !== null && teamName.trim() !== "") {
    console.log("Emitting addTeam:", teamName.trim()); // Debug log
    socket.emit("addTeam", { name: teamName.trim() });
  }
}

document.getElementById("importForm").onsubmit = async (e) => {
  e.preventDefault();
  const file = document.getElementById("importFile").files[0];
  const merge = document.getElementById("mergeCheckbox").checked;
  if (!file) return alert("Select a file first.");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("merge", merge);

  const res = await fetch(`/import?merge=${merge}`, { method: "POST", body: formData });
  const msg = await res.text();
  alert(msg);
};