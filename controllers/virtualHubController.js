const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all virtual hubs
exports.getAllVirtualHubs = async (req, res) => {
  try {
    const hubs = await prisma.virtualHub.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json(hubs);
  } catch (error) {
    console.error('Error fetching virtual hubs:', error);
    res.status(500).json({ error: 'Failed to fetch virtual hubs' });
  }
};

// Create new virtual hub
exports.createVirtualHub = async (req, res) => {
  try {
    const { name, address, latitude, longitude, type, radius } = req.body;
    
    // Validation
    if (!name || !latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Name, latitude, and longitude are required' 
      });
    }
    
    const newHub = await prisma.virtualHub.create({
      data: {
        name,
        address: address || null,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        type: type || null,
        radius: radius ? parseFloat(radius) : null
      }
    });
    
    res.status(201).json(newHub);
  } catch (error) {
    console.error('Error creating virtual hub:', error);
    res.status(500).json({ error: 'Failed to create virtual hub' });
  }
};

// Get single virtual hub by ID
exports.getVirtualHubById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const hub = await prisma.virtualHub.findUnique({
      where: { id }
    });
    
    if (!hub) {
      return res.status(404).json({ error: 'Virtual hub not found' });
    }
    
    res.json(hub);
  } catch (error) {
    console.error('Error fetching virtual hub:', error);
    res.status(500).json({ error: 'Failed to fetch virtual hub' });
  }
};

// Update virtual hub
exports.updateVirtualHub = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, latitude, longitude, type, radius } = req.body;
    
    const updatedHub = await prisma.virtualHub.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(address !== undefined && { address }),
        ...(latitude && { latitude: parseFloat(latitude) }),
        ...(longitude && { longitude: parseFloat(longitude) }),
        ...(type !== undefined && { type }),
        ...(radius !== undefined && { radius: radius ? parseFloat(radius) : null })
      }
    });
    
    res.json(updatedHub);
  } catch (error) {
    console.error('Error updating virtual hub:', error);
    res.status(500).json({ error: 'Failed to update virtual hub' });
  }
};

// Delete virtual hub
exports.deleteVirtualHub = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.virtualHub.delete({
      where: { id }
    });
    
    res.json({ message: 'Virtual hub deleted successfully' });
  } catch (error) {
    console.error('Error deleting virtual hub:', error);
    res.status(500).json({ error: 'Failed to delete virtual hub' });
  }
};
