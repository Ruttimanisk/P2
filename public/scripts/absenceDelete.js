function deleteAbsence(id) {
  if (confirm("Are you sure you want to delete this absence?")) {
    fetch(`/admin/absence/${id}`, {
      method: 'DELETE',
    })
    .then(res => {
      if (res.ok) {
        // Optionally redirect or remove from DOM
        window.location.reload();
      } else {
        alert("Failed to delete absence.");
      }
    })
    .catch(err => {
      console.error(err);
      alert("Error occurred.");
    });
  }
}
