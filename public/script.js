const socket = io();
const listsDiv = document.getElementById("lists");

function renderLists(teams) {
  listsDiv.innerHTML = "";

  for (const [team, items] of Object.entries(teams)) {
    const div = document.createElement("div");
    div.className = "team-container";
    div.innerHTML = `<h3>${team}</h3>`;
    const ul = document.createElement("ul");
    ul.className = "ranking-list";

    items.forEach((item, idx) => {
      const li = document.createElement("li");
      li.className = "rank-item";
      li.draggable = true;

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

      li.ondragstart = (e) => e.dataTransfer.setData("index", idx);
      ul.ondragover = (e) => e.preventDefault();
      ul.ondrop = (e) => {
        const from = e.dataTransfer.getData("index");
        const newOrder = [...items];
        const moved = newOrder.splice(from, 1)[0];
        newOrder.splice(idx, 0, moved);
        socket.emit("reorder", { team, newOrder });
      };

      ul.appendChild(li);
    });

    div.appendChild(ul);
    listsDiv.appendChild(div);
  }
}

socket.on("initData", renderLists);
socket.on("updateData", renderLists);

function addItem() {
  const text = document.getElementById("newItem").value.trim();
  const number = parseFloat(document.getElementById("newNumber").value);
  if (!text) return alert("Enter an item name.");
  if (isNaN(number)) return alert("Enter a valid number.");

  socket.emit("addItem", { text, number });
  document.getElementById("newItem").value = "";
  document.getElementById("newNumber").value = "";
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
