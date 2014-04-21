require 'spec_helper'

describe 'Duplicate Service Options', reset: false do
  downloadable_dataset_id = 'C179003030-ORNL_DAAC'
  downloadable_dataset_title = '15 Minute Stream Flow Data: USGS (FIFE)'

  non_downloadable_dataset_id = 'C179001887-SEDAC'
  non_downloadable_dataset_title = '2000 Pilot Environmental Sustainability Index (ESI)'

  before :all do
    visit '/search'
    login
    add_dataset_to_project(downloadable_dataset_id, downloadable_dataset_title)
    add_dataset_to_project(non_downloadable_dataset_id, non_downloadable_dataset_title)

    dataset_results.click_link "View Project"
    click_link "Retrieve project data"
  end

  context "when setting options for downloadable dataset" do
    after :all do
      reset_access_page
    end

    it "shows 'additional access method' button" do
      expect(page).to have_button 'Additional access method'
    end

    context "when clicking 'additional access method' button" do
      before :all do
        click_button 'Additional access method'
      end

      it "adds an additional service option" do
        expect(page).to have_content 'Download', count: 2
      end
    end
  end

  context "when setting options for non-downloadable dataset" do
    before :all do
      choose 'Download'
      click_button 'Continue'
    end

    after :all do
      reset_access_page
    end

    it "does not show 'additional access method' button" do
      expect(page).to have_no_button 'Additional access method'
    end
  end
end
