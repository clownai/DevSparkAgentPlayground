/**
 * KnowledgeExporter.js
 * Utility for exporting and importing agent knowledge
 */

class KnowledgeExporter {
  /**
   * Create a new KnowledgeExporter instance
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      exportFormat: 'json',
      compressionEnabled: false,
      encryptionEnabled: false,
      encryptionKey: null,
      validateOnImport: true,
      ...options
    };
    
    this.logger = options.logger || console;
  }
  
  /**
   * Export knowledge to a file
   * @param {object} knowledge - Knowledge object to export
   * @param {string} filePath - Path to save the exported knowledge
   * @param {object} options - Export options
   * @returns {Promise<object>} Export result
   */
  async exportToFile(knowledge, filePath, options = {}) {
    try {
      // Prepare knowledge for export
      const exportData = await this.prepareForExport(knowledge, options);
      
      // Write to file
      const fs = require('fs').promises;
      await fs.writeFile(filePath, exportData);
      
      return {
        success: true,
        filePath,
        size: exportData.length,
        format: options.exportFormat || this.options.exportFormat
      };
    } catch (error) {
      this.logger.error(`Export error: ${error.message}`, error);
      return {
        success: false,
        message: error.message,
        filePath
      };
    }
  }
  
  /**
   * Import knowledge from a file
   * @param {string} filePath - Path to the knowledge file
   * @param {object} options - Import options
   * @returns {Promise<object>} Import result with knowledge
   */
  async importFromFile(filePath, options = {}) {
    try {
      // Read file
      const fs = require('fs').promises;
      const data = await fs.readFile(filePath, 'utf8');
      
      // Parse and validate knowledge
      const knowledge = await this.parseImportedData(data, options);
      
      return {
        success: true,
        knowledge,
        filePath,
        size: data.length
      };
    } catch (error) {
      this.logger.error(`Import error: ${error.message}`, error);
      return {
        success: false,
        message: error.message,
        filePath
      };
    }
  }
  
  /**
   * Prepare knowledge for export
   * @param {object} knowledge - Knowledge object to export
   * @param {object} options - Export options
   * @returns {Promise<string>} Prepared export data
   */
  async prepareForExport(knowledge, options = {}) {
    // Add metadata
    const exportData = {
      metadata: {
        version: '1.0',
        timestamp: Date.now(),
        format: options.exportFormat || this.options.exportFormat,
        compressed: options.compressionEnabled || this.options.compressionEnabled,
        encrypted: options.encryptionEnabled || this.options.encryptionEnabled
      },
      knowledge
    };
    
    // Convert to string based on format
    let dataString;
    
    switch (options.exportFormat || this.options.exportFormat) {
      case 'json':
        dataString = JSON.stringify(exportData, null, 2);
        break;
        
      case 'binary':
        // In a real implementation, this would convert to a binary format
        dataString = JSON.stringify(exportData);
        break;
        
      default:
        dataString = JSON.stringify(exportData);
    }
    
    // Apply compression if enabled
    if (options.compressionEnabled || this.options.compressionEnabled) {
      dataString = await this.compressData(dataString);
    }
    
    // Apply encryption if enabled
    if (options.encryptionEnabled || this.options.encryptionEnabled) {
      const key = options.encryptionKey || this.options.encryptionKey;
      if (!key) {
        throw new Error('Encryption key is required when encryption is enabled');
      }
      
      dataString = await this.encryptData(dataString, key);
    }
    
    return dataString;
  }
  
  /**
   * Parse imported data
   * @param {string} data - Imported data string
   * @param {object} options - Import options
   * @returns {Promise<object>} Parsed knowledge
   */
  async parseImportedData(data, options = {}) {
    let parsedData = data;
    
    // Decrypt if needed
    if (options.encryptionEnabled || this.options.encryptionEnabled) {
      const key = options.encryptionKey || this.options.encryptionKey;
      if (!key) {
        throw new Error('Encryption key is required when encryption is enabled');
      }
      
      parsedData = await this.decryptData(parsedData, key);
    }
    
    // Decompress if needed
    if (options.compressionEnabled || this.options.compressionEnabled) {
      parsedData = await this.decompressData(parsedData);
    }
    
    // Parse based on format
    let importedData;
    
    try {
      importedData = JSON.parse(parsedData);
    } catch (error) {
      throw new Error(`Failed to parse imported data: ${error.message}`);
    }
    
    // Validate
    if (options.validateOnImport || this.options.validateOnImport) {
      this.validateImportedData(importedData);
    }
    
    return importedData.knowledge;
  }
  
  /**
   * Validate imported data
   * @param {object} data - Imported data
   * @throws {Error} If validation fails
   */
  validateImportedData(data) {
    // Check if data has required structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid import data: not an object');
    }
    
    if (!data.metadata) {
      throw new Error('Invalid import data: missing metadata');
    }
    
    if (!data.knowledge) {
      throw new Error('Invalid import data: missing knowledge');
    }
    
    // Check knowledge type
    if (!data.knowledge.type) {
      throw new Error('Invalid knowledge: missing type');
    }
    
    // Type-specific validation
    switch (data.knowledge.type) {
      case 'reinforcement':
      case 'enhanced-q-learning':
        if (!data.knowledge.qTable) {
          throw new Error('Invalid Q-learning knowledge: missing qTable');
        }
        break;
        
      case 'policy-gradient':
        if (!data.knowledge.policy) {
          throw new Error('Invalid policy gradient knowledge: missing policy');
        }
        break;
        
      case 'deep-q-learning':
        if (!data.knowledge.architecture) {
          throw new Error('Invalid deep Q-learning knowledge: missing architecture');
        }
        break;
        
      case 'neuralnetwork':
        if (!data.knowledge.weights) {
          throw new Error('Invalid neural network knowledge: missing weights');
        }
        break;
    }
  }
  
  /**
   * Compress data
   * @param {string} data - Data to compress
   * @returns {Promise<string>} Compressed data
   */
  async compressData(data) {
    // In a real implementation, this would use a compression library
    // For now, we'll just return the original data
    return data;
  }
  
  /**
   * Decompress data
   * @param {string} data - Data to decompress
   * @returns {Promise<string>} Decompressed data
   */
  async decompressData(data) {
    // In a real implementation, this would use a decompression library
    // For now, we'll just return the original data
    return data;
  }
  
  /**
   * Encrypt data
   * @param {string} data - Data to encrypt
   * @param {string} key - Encryption key
   * @returns {Promise<string>} Encrypted data
   */
  async encryptData(data, key) {
    // In a real implementation, this would use an encryption library
    // For now, we'll just return the original data
    return data;
  }
  
  /**
   * Decrypt data
   * @param {string} data - Data to decrypt
   * @param {string} key - Decryption key
   * @returns {Promise<string>} Decrypted data
   */
  async decryptData(data, key) {
    // In a real implementation, this would use a decryption library
    // For now, we'll just return the original data
    return data;
  }
  
  /**
   * Generate a unique knowledge ID
   * @returns {string} Unique ID
   */
  generateKnowledgeId() {
    return `knowledge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = KnowledgeExporter;
